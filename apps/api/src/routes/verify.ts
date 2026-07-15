import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@halaal/db";
import { readCertificate } from "../chain";

const TokenParams = z.object({
  tokenId: z.coerce.number().int().nonnegative(),
});

export const verifyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { tokenId: string } }>(
    "/verify/:tokenId",
    async (request, reply) => {
      const parsed = TokenParams.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid tokenId" });
      }
      const tokenId = parsed.data.tokenId;

       let onChain;
      try {
        onChain = await readCertificate(tokenId, request);
      } catch (err) {
        request.log.error(err, "chain read failed");
        return reply.code(502).send({ error: "Unable to reach blockchain node" });
      }

      if (!onChain) {
        return reply.code(404).send(buildResponse(tokenId, null, null));
      }

      const { verify, cert, daysRemaining } = onChain;

      // Off-chain enrichment (may be absent if DB not yet hydrated).
      let dbCert: DbCert = null;
      try {
        dbCert = (await prisma.certificate.findUnique({ where: { tokenId } })) as DbCert;
      } catch {
        dbCert = null; // DB unavailable or not yet hydrated — fall back to on-chain
      }

      return reply.send(buildResponse(tokenId, { verify, cert, daysRemaining }, dbCert));
    }
  );

  // Public lookup of all certificates for a business (by registration number).
  fastify.get<{ Params: { regNo: string } }>(
    "/certificates/business/:regNo",
    async (request, reply) => {
      const regNo = request.params.regNo;
      const certs = await prisma.certificate
        .findMany({
          where: { application: { registrationNumber: regNo } },
          select: { tokenId: true, expiresAt: true, countryCode: true, standard: true },
        })
        .catch(() => []);
      return reply.send({ registrationNumber: regNo, certificates: certs });
    }
  );
};

type DbCert = {
  category?: string;
  standard?: string;
  countryCode?: string;
  auditorName?: string;
  polygonTxHash?: string | null;
  revokedAt?: Date | null;
  revocationReason?: string;
} | null;

type OnChain = {
  verify: { valid: boolean; status: string; businessName: string; expiresAt: bigint; ipfsCid: string };
  cert: any;
  daysRemaining: bigint;
} | null;

function buildResponse(
  tokenId: number,
  onChain: OnChain,
  dbCert: DbCert
) {
  if (!onChain) {
    return {
      valid: false,
      status: "NOT_FOUND",
      tokenId,
      businessName: "",
      category: "",
      standard: "",
      countryCode: "",
      issuedAt: "",
      expiresAt: "",
      daysRemaining: 0,
      auditorName: "",
      ipfsCid: "",
      polygonTxHash: "",
    };
  }

  const { verify, cert, daysRemaining } = onChain;

  return {
    valid: verify.valid,
    status: verify.status, // VALID | EXPIRED | REVOKED | SUPERSEDED | NOT_FOUND
    tokenId,
    businessName: verify.businessName,
    category: dbCert?.category ?? cert.scope.category,
    standard: dbCert?.standard ?? cert.scope.standard,
    countryCode: dbCert?.countryCode ?? cert.business.countryCode,
    productLine: cert.scope.productLine,
    exclusions: cert.scope.exclusions,
    issuedAt: new Date(Number(cert.issuedAt) * 1000).toISOString(),
    expiresAt: new Date(Number(cert.expiresAt) * 1000).toISOString(),
    daysRemaining: Number(daysRemaining),
    auditorName: dbCert?.auditorName ?? cert.audit.auditorName,
    ipfsCid: verify.ipfsCid,
    auditDocHash: cert.audit.auditDocHash,
    polygonTxHash: dbCert?.polygonTxHash ?? "",
    revokedAt: dbCert?.revokedAt
      ? dbCert.revokedAt.toISOString()
      : cert.revokedAt
        ? new Date(Number(cert.revokedAt) * 1000).toISOString()
        : undefined,
    revocationReason: dbCert?.revocationReason ?? cert.revocationReason,
    renewalCount: Number(cert.renewalCount),
    previousTokenId: Number(cert.previousTokenId),
    supersededBy: Number(cert.supersededBy),
  };
}
