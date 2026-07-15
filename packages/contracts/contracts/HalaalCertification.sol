// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║          HALAAL CERTIFICATION ON-CHAIN REGISTRY               ║
 * ║          ERC-721 (soulbound) — Polygon (MATIC / POL)         ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Each certificate is a NON-TRANSFERABLE (soulbound) ERC-721 token.
 *
 * Design decisions vs. the original draft (see PRD review):
 *   1. NO personal data (PII) is stored on-chain. Physical address and
 *      contact email live off-chain (encrypted, erasable for GDPR/POPIA).
 *      Only a `businessDataHash` commitment is anchored on-chain so the
 *      off-chain record's integrity can be proven without exposing PII.
 *      Business name / registration number / country are public business
 *      identity and remain on-chain for verification.
 *   2. Renewal SUPERSEDES the old token: its validity ends immediately so
 *      a business can never present two simultaneously-valid certificates.
 *   3. Tokens are soulbound — a certification record must not be sold or
 *      moved. Only minting is allowed.
 *   4. revoke / renew / updateAuditDocument are restricted to the ORIGINAL
 *      issuing auditor or an admin, not any arbitrary certifier.
 *   5. Revocation is allowed while paused (you revoke during emergencies).
 *
 * Dependencies (OpenZeppelin v5):
 *   @openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol
 *   @openzeppelin/contracts/access/AccessControl.sol
 *   @openzeppelin/contracts/utils/Pausable.sol
 *   @openzeppelin/contracts/utils/ReentrancyGuard.sol
 */

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract HalaalCertification is
    ERC721URIStorage,
    AccessControl,
    Pausable,
    ReentrancyGuard
{
    // ─────────────────────────────────────────────
    //  ROLES
    // ─────────────────────────────────────────────
    bytes32 public constant CERTIFIER_ROLE = keccak256("CERTIFIER_ROLE");
    bytes32 public constant PAUSER_ROLE    = keccak256("PAUSER_ROLE");

    // ─────────────────────────────────────────────
    //  CERTIFICATE SCHEMA
    // ─────────────────────────────────────────────

    /// Public business identity only. NO personal/erasable data on-chain.
    struct BusinessInfo {
        string  businessName;       // Public legal entity name
        string  registrationNumber; // Public national business registration ID
        bytes2  countryCode;        // ISO 3166-1 alpha-2 (e.g. "ZA", "MY")
        bytes32 businessDataHash;   // keccak256 commitment of off-chain PII record
    }

    struct CertificationScope {
        string   category;          // e.g. "Food & Beverage", "Cosmetics"
        string   productLine;       // Specific products or services covered
        string   standard;          // e.g. "SANHA", "JAKIM", "HFA", "MUI"
        string[] exclusions;        // Items explicitly NOT covered
    }

    struct AuditMetadata {
        address  auditorAddress;    // Polygon address of the certifying auditor
        string   auditorName;       // Human-readable auditor name
        bytes32  auditDocHash;      // keccak256 of the full audit report
        string   ipfsCid;           // IPFS CID for the full audit PDF
        uint256  auditDate;         // Unix timestamp of on-site inspection
    }

    struct Certificate {
        uint256             tokenId;
        BusinessInfo        business;
        CertificationScope  scope;
        AuditMetadata       audit;
        uint256             issuedAt;
        uint256             expiresAt;
        bool                revoked;
        string              revocationReason;
        uint256             revokedAt;
        uint256             renewalCount;
        uint256             previousTokenId; // links renewal chain (0 = original)
        uint256             supersededBy;    // newTokenId that replaced this (0 = active)
        address             issuedBy;        // certifier who minted/renewed this token
    }

    // ─────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────
    uint256 private _tokenIdCounter;

    mapping(uint256 => Certificate) private _certificates;

    /// keccak256(registrationNumber, countryCode) → list of tokenIds
    mapping(bytes32 => uint256[]) private _businessCertificates;

    string public certifyingBodyName;
    string public certifyingBodyWebsite;

    // ─────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────
    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed auditor,
        string  businessName,
        bytes2  countryCode,
        uint256 issuedAt,
        uint256 expiresAt
    );
    event CertificateRevoked(
        uint256 indexed tokenId,
        address indexed revokedBy,
        string  reason,
        uint256 revokedAt
    );
    event CertificateRenewed(
        uint256 indexed oldTokenId,
        uint256 indexed newTokenId,
        address indexed auditor,
        uint256 newExpiresAt
    );
    event AuditDocumentUpdated(uint256 indexed tokenId, bytes32 newDocHash, string newIpfsCid);
    event TokenURIUpdated(uint256 indexed tokenId, string newUri);
    event CertifyingBodyUpdated(string name, string website);

    // ─────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────
    constructor(string memory _certifyingBodyName, string memory _certifyingBodyWebsite)
        ERC721("Halaal Certification", "HALAAL")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CERTIFIER_ROLE,     msg.sender);
        _grantRole(PAUSER_ROLE,        msg.sender);

        certifyingBodyName    = _certifyingBodyName;
        certifyingBodyWebsite = _certifyingBodyWebsite;
    }

    // ─────────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────────

    /// Restrict mutation to the token's original issuer or an admin.
    modifier onlyIssuerOrAdmin(uint256 tokenId) {
        require(
            _certificates[tokenId].issuedBy == msg.sender ||
                hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "HalaalCert: not issuer or admin"
        );
        _;
    }

    // ─────────────────────────────────────────────
    //  CORE: ISSUE
    // ─────────────────────────────────────────────
    function issueCertificate(
        address                     to,
        BusinessInfo       calldata businessInfo,
        CertificationScope calldata scope,
        AuditMetadata      calldata auditMeta,
        uint256                     validityDays,
        string             calldata tokenURI_
    )
        external
        onlyRole(CERTIFIER_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 tokenId)
    {
        require(to != address(0), "HalaalCert: zero address");
        require(bytes(businessInfo.businessName).length > 0, "HalaalCert: empty business name");
        require(validityDays > 0 && validityDays <= 1825, "HalaalCert: validity 1-1825 days");
        require(auditMeta.auditDocHash != bytes32(0), "HalaalCert: missing audit hash");

        _tokenIdCounter++;
        tokenId = _tokenIdCounter;

        uint256 issuedAt  = block.timestamp;
        uint256 expiresAt = issuedAt + (validityDays * 1 days);

        _certificates[tokenId] = Certificate({
            tokenId:          tokenId,
            business:         businessInfo,
            scope:            scope,
            audit:            auditMeta,
            issuedAt:         issuedAt,
            expiresAt:        expiresAt,
            revoked:          false,
            revocationReason: "",
            revokedAt:        0,
            renewalCount:     0,
            previousTokenId:  0,
            supersededBy:     0,
            issuedBy:         msg.sender
        });

        bytes32 bizKey = keccak256(
            abi.encodePacked(businessInfo.registrationNumber, businessInfo.countryCode)
        );
        _businessCertificates[bizKey].push(tokenId);

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        emit CertificateIssued(
            tokenId,
            auditMeta.auditorAddress,
            businessInfo.businessName,
            businessInfo.countryCode,
            issuedAt,
            expiresAt
        );
    }

    // ─────────────────────────────────────────────
    //  CORE: REVOKE  (allowed while paused)
    // ─────────────────────────────────────────────
    function revokeCertificate(uint256 tokenId, string calldata reason)
        external
        onlyRole(CERTIFIER_ROLE)
        onlyIssuerOrAdmin(tokenId)
    {
        _requireOwned(tokenId);
        Certificate storage cert = _certificates[tokenId];
        require(!cert.revoked, "HalaalCert: already revoked");
        require(bytes(reason).length > 0, "HalaalCert: reason required");

        cert.revoked          = true;
        cert.revocationReason = reason;
        cert.revokedAt        = block.timestamp;

        emit CertificateRevoked(tokenId, msg.sender, reason, block.timestamp);
    }

    // ─────────────────────────────────────────────
    //  CORE: RENEW  (supersedes the old token)
    // ─────────────────────────────────────────────
    function renewCertificate(
        uint256                oldTokenId,
        address                to,
        AuditMetadata calldata auditMeta,
        uint256                validityDays,
        string        calldata tokenURI_
    )
        external
        onlyRole(CERTIFIER_ROLE)
        onlyIssuerOrAdmin(oldTokenId)
        whenNotPaused
        nonReentrant
        returns (uint256 newTokenId)
    {
        _requireOwned(oldTokenId);
        Certificate storage oldCert = _certificates[oldTokenId];
        require(!oldCert.revoked, "HalaalCert: renewing a revoked certificate");
        require(oldCert.supersededBy == 0, "HalaalCert: already superseded");
        require(validityDays > 0 && validityDays <= 1825, "HalaalCert: validity 1-1825 days");

        _tokenIdCounter++;
        newTokenId = _tokenIdCounter;

        uint256 issuedAt  = block.timestamp;
        uint256 expiresAt = issuedAt + (validityDays * 1 days);

        _certificates[newTokenId] = Certificate({
            tokenId:          newTokenId,
            business:         oldCert.business,
            scope:            oldCert.scope,
            audit:            auditMeta,
            issuedAt:         issuedAt,
            expiresAt:        expiresAt,
            revoked:          false,
            revocationReason: "",
            revokedAt:        0,
            renewalCount:     oldCert.renewalCount + 1,
            previousTokenId:  oldTokenId,
            supersededBy:     0,
            issuedBy:         msg.sender
        });

        // Supersede the old token: end its validity now.
        oldCert.supersededBy = newTokenId;
        if (oldCert.expiresAt > issuedAt) {
            oldCert.expiresAt = issuedAt;
        }

        bytes32 bizKey = keccak256(
            abi.encodePacked(oldCert.business.registrationNumber, oldCert.business.countryCode)
        );
        _businessCertificates[bizKey].push(newTokenId);

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);

        emit CertificateRenewed(oldTokenId, newTokenId, auditMeta.auditorAddress, expiresAt);
    }

    // ─────────────────────────────────────────────
    //  CORE: UPDATE AUDIT DOCUMENT / METADATA
    // ─────────────────────────────────────────────
    function updateAuditDocument(uint256 tokenId, bytes32 newDocHash, string calldata newIpfsCid)
        external
        onlyRole(CERTIFIER_ROLE)
        onlyIssuerOrAdmin(tokenId)
        whenNotPaused
    {
        _requireOwned(tokenId);
        require(newDocHash != bytes32(0), "HalaalCert: empty hash");

        _certificates[tokenId].audit.auditDocHash = newDocHash;
        _certificates[tokenId].audit.ipfsCid      = newIpfsCid;

        emit AuditDocumentUpdated(tokenId, newDocHash, newIpfsCid);
    }

    /// Refresh the metadata JSON pointer (e.g. so tokenURI status reflects
    /// REVOKED/EXPIRED). On-chain `verifyCertificate` remains the source of truth.
    function setTokenURI(uint256 tokenId, string calldata newUri)
        external
        onlyRole(CERTIFIER_ROLE)
        onlyIssuerOrAdmin(tokenId)
        whenNotPaused
    {
        _requireOwned(tokenId);
        _setTokenURI(tokenId, newUri);
        emit TokenURIUpdated(tokenId, newUri);
    }

    // ─────────────────────────────────────────────
    //  READ: VERIFY
    // ─────────────────────────────────────────────
    function verifyCertificate(uint256 tokenId)
        external
        view
        returns (
            bool valid,
            string memory status,
            string memory businessName,
            uint256 expiresAt,
            string memory ipfsCid
        )
    {
        if (!_exists(tokenId)) {
            return (false, "NOT_FOUND", "", 0, "");
        }

        Certificate storage cert = _certificates[tokenId];
        businessName = cert.business.businessName;
        expiresAt    = cert.expiresAt;
        ipfsCid      = cert.audit.ipfsCid;

        if (cert.revoked) {
            return (false, "REVOKED", businessName, expiresAt, ipfsCid);
        }
        if (cert.supersededBy != 0) {
            return (false, "SUPERSEDED", businessName, expiresAt, ipfsCid);
        }
        if (block.timestamp > cert.expiresAt) {
            return (false, "EXPIRED", businessName, expiresAt, ipfsCid);
        }
        return (true, "VALID", businessName, expiresAt, ipfsCid);
    }

    function getCertificate(uint256 tokenId) external view returns (Certificate memory) {
        _requireOwned(tokenId);
        return _certificates[tokenId];
    }

    function getCertificatesByBusiness(string calldata registrationNumber, bytes2 countryCode)
        external
        view
        returns (uint256[] memory)
    {
        bytes32 bizKey = keccak256(abi.encodePacked(registrationNumber, countryCode));
        return _businessCertificates[bizKey];
    }

    function daysRemaining(uint256 tokenId) external view returns (uint256) {
        if (!_exists(tokenId)) return 0;
        Certificate storage cert = _certificates[tokenId];
        if (cert.revoked || cert.supersededBy != 0 || block.timestamp >= cert.expiresAt) return 0;
        return (cert.expiresAt - block.timestamp) / 1 days;
    }

    function totalCertificates() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ─────────────────────────────────────────────
    //  ADMIN
    // ─────────────────────────────────────────────
    function updateCertifyingBody(string calldata name, string calldata website)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        certifyingBodyName    = name;
        certifyingBodyWebsite = website;
        emit CertifyingBodyUpdated(name, website);
    }

    function pause()   external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    // ─────────────────────────────────────────────
    //  OVERRIDES — SOULBOUND
    // ─────────────────────────────────────────────

    /// @dev Certificates are soulbound: only minting (from == 0) is permitted.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        whenNotPaused
        returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0), "HalaalCert: soulbound, non-transferable");
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ─────────────────────────────────────────────
    //  INTERNAL HELPERS
    // ─────────────────────────────────────────────
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
