import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { HalaalCertification } from "../typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const DAY = 24 * 60 * 60;

const AUDIT_HASH = ethers.keccak256(ethers.toUtf8Bytes("audit-report-v1"));
const BIZ_HASH = ethers.keccak256(ethers.toUtf8Bytes("pii-record-v1"));

function businessInfo(overrides: Partial<any> = {}) {
  return {
    businessName: "Al-Baraka Foods (Pty) Ltd",
    registrationNumber: "2018/034521/07",
    countryCode: ethers.encodeBytes32String("ZA").slice(0, 6), // bytes2 -> "0x5a41"
    businessDataHash: BIZ_HASH,
    ...overrides,
  };
}

// bytes2 helper: ISO code -> 0x + 2 bytes hex
function toBytes2(code: string): string {
  return ethers.hexlify(ethers.toUtf8Bytes(code)); // "ZA" -> 0x5a41 (2 bytes)
}

function scope(overrides: Partial<any> = {}) {
  return {
    category: "Food & Beverage",
    productLine: "Processed poultry — all SKUs",
    standard: "SANHA",
    exclusions: ["Imported gelatin"],
    ...overrides,
  };
}

function auditMeta(auditor: string, overrides: Partial<any> = {}) {
  return {
    auditorAddress: auditor,
    auditorName: "Sheikh Mohammed Al-Rashid",
    auditDocHash: AUDIT_HASH,
    ipfsCid: "QmAuditDoc123",
    auditDate: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

describe("HalaalCertification", () => {
  let contract: HalaalCertification;
  let admin: HardhatEthersSigner;
  let certifier: HardhatEthersSigner;
  let otherCertifier: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const ZA = toBytes2("ZA");

  async function issue(
    signer = certifier,
    biz = businessInfo({ countryCode: ZA }),
    validityDays = 365,
    uri = "ipfs://QmCert1"
  ) {
    return contract
      .connect(signer)
      .issueCertificate(treasury.address, biz, scope(), auditMeta(signer.address), validityDays, uri);
  }

  beforeEach(async () => {
    [admin, certifier, otherCertifier, treasury, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("HalaalCertification");
    contract = (await Factory.deploy("SANHA", "https://www.sanha.org.za")) as unknown as HalaalCertification;
    await contract.waitForDeployment();
    await contract.connect(admin).grantRole(await contract.CERTIFIER_ROLE(), certifier.address);
    await contract.connect(admin).grantRole(await contract.CERTIFIER_ROLE(), otherCertifier.address);
  });

  describe("deployment", () => {
    it("sets name, symbol and certifying body", async () => {
      expect(await contract.name()).to.equal("Halaal Certification");
      expect(await contract.symbol()).to.equal("HALAAL");
      expect(await contract.certifyingBodyName()).to.equal("SANHA");
      expect(await contract.certifyingBodyWebsite()).to.equal("https://www.sanha.org.za");
    });

    it("grants admin all roles on deploy", async () => {
      expect(await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      expect(await contract.hasRole(await contract.CERTIFIER_ROLE(), admin.address)).to.be.true;
      expect(await contract.hasRole(await contract.PAUSER_ROLE(), admin.address)).to.be.true;
    });
  });

  describe("issueCertificate", () => {
    it("mints a token and emits CertificateIssued", async () => {
      await expect(issue())
        .to.emit(contract, "CertificateIssued")
        .withArgs(1n, certifier.address, "Al-Baraka Foods (Pty) Ltd", ZA, anyValue(), anyValue());
      expect(await contract.ownerOf(1)).to.equal(treasury.address);
      expect(await contract.tokenURI(1)).to.equal("ipfs://QmCert1");
      expect(await contract.totalCertificates()).to.equal(1n);
    });

    it("records issuer and validity window", async () => {
      await issue(certifier, businessInfo({ countryCode: ZA }), 365);
      const cert = await contract.getCertificate(1);
      expect(cert.issuedBy).to.equal(certifier.address);
      expect(cert.expiresAt - cert.issuedAt).to.equal(BigInt(365 * DAY));
      expect(cert.revoked).to.be.false;
      expect(cert.supersededBy).to.equal(0n);
    });

    it("reverts for non-certifier", async () => {
      await expect(issue(stranger)).to.be.revertedWithCustomError(
        contract,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("reverts on zero recipient", async () => {
      await expect(
        contract
          .connect(certifier)
          .issueCertificate(ethers.ZeroAddress, businessInfo({ countryCode: ZA }), scope(), auditMeta(certifier.address), 365, "ipfs://x")
      ).to.be.revertedWith("HalaalCert: zero address");
    });

    it("reverts on empty business name", async () => {
      await expect(
        issue(certifier, businessInfo({ countryCode: ZA, businessName: "" }))
      ).to.be.revertedWith("HalaalCert: empty business name");
    });

    it("reverts on invalid validity period", async () => {
      await expect(issue(certifier, businessInfo({ countryCode: ZA }), 0)).to.be.revertedWith(
        "HalaalCert: validity 1-1825 days"
      );
      await expect(issue(certifier, businessInfo({ countryCode: ZA }), 1826)).to.be.revertedWith(
        "HalaalCert: validity 1-1825 days"
      );
    });

    it("reverts on missing audit hash", async () => {
      await expect(
        contract
          .connect(certifier)
          .issueCertificate(
            treasury.address,
            businessInfo({ countryCode: ZA }),
            scope(),
            auditMeta(certifier.address, { auditDocHash: ethers.ZeroHash }),
            365,
            "ipfs://x"
          )
      ).to.be.revertedWith("HalaalCert: missing audit hash");
    });

    it("indexes certificate by business", async () => {
      await issue();
      const ids = await contract.getCertificatesByBusiness("2018/034521/07", ZA);
      expect(ids).to.deep.equal([1n]);
    });
  });

  describe("verifyCertificate", () => {
    it("returns NOT_FOUND for unknown token", async () => {
      const [valid, status] = await contract.verifyCertificate(999);
      expect(valid).to.be.false;
      expect(status).to.equal("NOT_FOUND");
    });

    it("returns VALID for a fresh certificate", async () => {
      await issue();
      const [valid, status, name, , cid] = await contract.verifyCertificate(1);
      expect(valid).to.be.true;
      expect(status).to.equal("VALID");
      expect(name).to.equal("Al-Baraka Foods (Pty) Ltd");
      expect(cid).to.equal("QmAuditDoc123");
    });

    it("returns EXPIRED after expiry", async () => {
      await issue(certifier, businessInfo({ countryCode: ZA }), 1);
      await time.increase(2 * DAY);
      const [valid, status] = await contract.verifyCertificate(1);
      expect(valid).to.be.false;
      expect(status).to.equal("EXPIRED");
    });

    it("returns REVOKED after revocation", async () => {
      await issue();
      await contract.connect(certifier).revokeCertificate(1, "Non-compliance found");
      const [valid, status] = await contract.verifyCertificate(1);
      expect(valid).to.be.false;
      expect(status).to.equal("REVOKED");
    });
  });

  describe("revokeCertificate", () => {
    beforeEach(() => issue());

    it("revokes and emits event", async () => {
      await expect(contract.connect(certifier).revokeCertificate(1, "fraud"))
        .to.emit(contract, "CertificateRevoked")
        .withArgs(1n, certifier.address, "fraud", anyValue());
      const cert = await contract.getCertificate(1);
      expect(cert.revoked).to.be.true;
      expect(cert.revocationReason).to.equal("fraud");
    });

    it("allows admin to revoke another certifier's cert", async () => {
      await expect(contract.connect(admin).revokeCertificate(1, "admin action")).to.not.be.reverted;
    });

    it("blocks a different certifier from revoking", async () => {
      await expect(
        contract.connect(otherCertifier).revokeCertificate(1, "not mine")
      ).to.be.revertedWith("HalaalCert: not issuer or admin");
    });

    it("requires a reason", async () => {
      await expect(contract.connect(certifier).revokeCertificate(1, "")).to.be.revertedWith(
        "HalaalCert: reason required"
      );
    });

    it("cannot double-revoke", async () => {
      await contract.connect(certifier).revokeCertificate(1, "once");
      await expect(contract.connect(certifier).revokeCertificate(1, "twice")).to.be.revertedWith(
        "HalaalCert: already revoked"
      );
    });

    it("is allowed while paused", async () => {
      await contract.connect(admin).pause();
      await expect(contract.connect(certifier).revokeCertificate(1, "emergency")).to.not.be.reverted;
    });
  });

  describe("renewCertificate", () => {
    beforeEach(() => issue());

    it("mints a linked token and supersedes the old one", async () => {
      await expect(
        contract
          .connect(certifier)
          .renewCertificate(1, treasury.address, auditMeta(certifier.address), 365, "ipfs://QmCert2")
      )
        .to.emit(contract, "CertificateRenewed")
        .withArgs(1n, 2n, certifier.address, anyValue());

      const oldCert = await contract.getCertificate(1);
      const newCert = await contract.getCertificate(2);
      expect(oldCert.supersededBy).to.equal(2n);
      expect(newCert.previousTokenId).to.equal(1n);
      expect(newCert.renewalCount).to.equal(1n);
    });

    it("makes the old certificate no longer VALID (no double-valid window)", async () => {
      await contract
        .connect(certifier)
        .renewCertificate(1, treasury.address, auditMeta(certifier.address), 365, "ipfs://QmCert2");

      const [oldValid, oldStatus] = await contract.verifyCertificate(1);
      const [newValid, newStatus] = await contract.verifyCertificate(2);
      expect(oldValid).to.be.false;
      expect(oldStatus).to.equal("SUPERSEDED");
      expect(newValid).to.be.true;
      expect(newStatus).to.equal("VALID");
    });

    it("cannot renew a revoked certificate", async () => {
      await contract.connect(certifier).revokeCertificate(1, "bad");
      await expect(
        contract
          .connect(certifier)
          .renewCertificate(1, treasury.address, auditMeta(certifier.address), 365, "ipfs://x")
      ).to.be.revertedWith("HalaalCert: renewing a revoked certificate");
    });

    it("cannot renew an already-superseded certificate", async () => {
      await contract
        .connect(certifier)
        .renewCertificate(1, treasury.address, auditMeta(certifier.address), 365, "ipfs://c2");
      await expect(
        contract
          .connect(certifier)
          .renewCertificate(1, treasury.address, auditMeta(certifier.address), 365, "ipfs://c3")
      ).to.be.revertedWith("HalaalCert: already superseded");
    });

    it("blocks a different certifier from renewing", async () => {
      await expect(
        contract
          .connect(otherCertifier)
          .renewCertificate(1, treasury.address, auditMeta(otherCertifier.address), 365, "ipfs://x")
      ).to.be.revertedWith("HalaalCert: not issuer or admin");
    });
  });

  describe("updateAuditDocument & setTokenURI", () => {
    beforeEach(() => issue());

    it("updates audit doc hash and cid", async () => {
      const newHash = ethers.keccak256(ethers.toUtf8Bytes("v2"));
      await expect(contract.connect(certifier).updateAuditDocument(1, newHash, "QmNew"))
        .to.emit(contract, "AuditDocumentUpdated")
        .withArgs(1n, newHash, "QmNew");
      const cert = await contract.getCertificate(1);
      expect(cert.audit.auditDocHash).to.equal(newHash);
      expect(cert.audit.ipfsCid).to.equal("QmNew");
    });

    it("rejects empty hash", async () => {
      await expect(
        contract.connect(certifier).updateAuditDocument(1, ethers.ZeroHash, "x")
      ).to.be.revertedWith("HalaalCert: empty hash");
    });

    it("allows certifier to refresh tokenURI", async () => {
      await expect(contract.connect(certifier).setTokenURI(1, "ipfs://updated"))
        .to.emit(contract, "TokenURIUpdated")
        .withArgs(1n, "ipfs://updated");
      expect(await contract.tokenURI(1)).to.equal("ipfs://updated");
    });
  });

  describe("daysRemaining", () => {
    it("returns 0 for unknown token", async () => {
      expect(await contract.daysRemaining(999)).to.equal(0n);
    });

    it("returns remaining days for a valid cert", async () => {
      await issue(certifier, businessInfo({ countryCode: ZA }), 10);
      // read immediately after issue in the same timestamp -> full 10 days
      expect(await contract.daysRemaining(1)).to.equal(10n);
      // after ~1.5 days elapsed, floor gives 8
      await time.increase(Math.floor(1.5 * DAY));
      expect(await contract.daysRemaining(1)).to.equal(8n);
    });

    it("returns 0 for revoked/superseded/expired", async () => {
      await issue(certifier, businessInfo({ countryCode: ZA }), 10);
      await contract.connect(certifier).revokeCertificate(1, "x");
      expect(await contract.daysRemaining(1)).to.equal(0n);
    });
  });

  describe("soulbound behaviour", () => {
    beforeEach(() => issue());

    it("reverts on transfer", async () => {
      await expect(
        contract.connect(treasury).transferFrom(treasury.address, stranger.address, 1)
      ).to.be.revertedWith("HalaalCert: soulbound, non-transferable");
    });
  });

  describe("pause / unpause", () => {
    it("blocks issuance while paused, resumes after unpause", async () => {
      await contract.connect(admin).pause();
      await expect(issue()).to.be.revertedWithCustomError(contract, "EnforcedPause");
      await contract.connect(admin).unpause();
      await expect(issue()).to.not.be.reverted;
    });

    it("only pauser can pause", async () => {
      await expect(contract.connect(stranger).pause()).to.be.revertedWithCustomError(
        contract,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("admin", () => {
    it("updates certifying body", async () => {
      await expect(contract.connect(admin).updateCertifyingBody("MJC", "https://mjc.org.za"))
        .to.emit(contract, "CertifyingBodyUpdated")
        .withArgs("MJC", "https://mjc.org.za");
      expect(await contract.certifyingBodyName()).to.equal("MJC");
    });

    it("non-admin cannot update certifying body", async () => {
      await expect(
        contract.connect(certifier).updateCertifyingBody("x", "y")
      ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
    });
  });

  describe("supportsInterface", () => {
    it("supports ERC721 and AccessControl", async () => {
      expect(await contract.supportsInterface("0x80ac58cd")).to.be.true; // ERC721
      expect(await contract.supportsInterface("0x7965db0b")).to.be.true; // AccessControl
    });
  });
});

// small helper mirroring hardhat-chai-matchers anyValue
function anyValue() {
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  return anyValue;
}
