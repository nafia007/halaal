// Minimal ABI for the read paths used by the public verify endpoint.
export const halaalCertificationAbi = [
  {
    type: "function",
    name: "verifyCertificate",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "valid", type: "bool" },
      { name: "status", type: "string" },
      { name: "businessName", type: "string" },
      { name: "expiresAt", type: "uint256" },
      { name: "ipfsCid", type: "string" },
    ],
  },
  {
    type: "function",
    name: "daysRemaining",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "issueCertificate",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      {
        name: "businessInfo",
        type: "tuple",
        components: [
          { name: "businessName", type: "string" },
          { name: "registrationNumber", type: "string" },
          { name: "countryCode", type: "bytes2" },
          { name: "businessDataHash", type: "bytes32" },
        ],
      },
      {
        name: "scope",
        type: "tuple",
        components: [
          { name: "category", type: "string" },
          { name: "productLine", type: "string" },
          { name: "standard", type: "string" },
          { name: "exclusions", type: "string[]" },
        ],
      },
      {
        name: "auditMeta",
        type: "tuple",
        components: [
          { name: "auditorAddress", type: "address" },
          { name: "auditorName", type: "string" },
          { name: "auditDocHash", type: "bytes32" },
          { name: "ipfsCid", type: "string" },
          { name: "auditDate", type: "uint256" },
        ],
      },
      { name: "validityDays", type: "uint256" },
      { name: "tokenURI_", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "event",
    name: "CertificateIssued",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "auditor", type: "address", indexed: true },
      { name: "businessName", type: "string", indexed: false },
      { name: "countryCode", type: "bytes2", indexed: false },
      { name: "issuedAt", type: "uint256", indexed: false },
      { name: "expiresAt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "getCertificate",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "tokenId", type: "uint256" },
          {
            name: "business",
            type: "tuple",
            components: [
              { name: "businessName", type: "string" },
              { name: "registrationNumber", type: "string" },
              { name: "countryCode", type: "bytes2" },
              { name: "businessDataHash", type: "bytes32" },
            ],
          },
          {
            name: "scope",
            type: "tuple",
            components: [
              { name: "category", type: "string" },
              { name: "productLine", type: "string" },
              { name: "standard", type: "string" },
              { name: "exclusions", type: "string[]" },
            ],
          },
          {
            name: "audit",
            type: "tuple",
            components: [
              { name: "auditorAddress", type: "address" },
              { name: "auditorName", type: "string" },
              { name: "auditDocHash", type: "bytes32" },
              { name: "ipfsCid", type: "string" },
              { name: "auditDate", type: "uint256" },
            ],
          },
          { name: "issuedAt", type: "uint256" },
          { name: "expiresAt", type: "uint256" },
          { name: "revoked", type: "bool" },
          { name: "revocationReason", type: "string" },
          { name: "revokedAt", type: "uint256" },
          { name: "renewalCount", type: "uint256" },
          { name: "previousTokenId", type: "uint256" },
          { name: "supersededBy", type: "uint256" },
          { name: "issuedBy", type: "address" },
        ],
      },
    ],
  },
] as const;
