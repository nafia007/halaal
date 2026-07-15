export type CertStatus = "VALID" | "EXPIRED" | "REVOKED" | "SUPERSEDED" | "NOT_FOUND";

export interface VerifyResponse {
  valid: boolean;
  status: CertStatus;
  tokenId: number;
  businessName: string;
  category: string;
  standard: string;
  countryCode: string;
  productLine?: string;
  exclusions?: string[];
  issuedAt: string;
  expiresAt: string;
  daysRemaining: number;
  auditorName: string;
  ipfsCid: string;
  auditDocHash?: string;
  polygonTxHash?: string;
  revokedAt?: string;
  revocationReason?: string;
  renewalCount?: number;
  previousTokenId?: number;
  supersededBy?: number;
}
