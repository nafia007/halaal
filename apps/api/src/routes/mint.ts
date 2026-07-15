import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { keccak256, stringToHex } from "viem";
import { prisma, memoryStore } from "@halaal/db";
import { issueOnChain, relayer } from "../chain";
import { requireAuth } from "../middleware/auth";

const MintBody = z.object({
  // Optional but recommended: ties the mint to a reviewed application and
  // enforces the workflow state machine (only APPROVED may mint).
  applicationId: z.string().min(1).optional(),
  to: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "invalid treasury address"),
  businessName: z.string().min(1),
  registrationNumber: z.string().min(1),
  countryCode: z.string().length(2, "ISO 3166-1 alpha-2, e.g. ZA"),
  category: z.string().min(1),
  productLine: z.string().min(1),
  standard: z.string().min(1),
  exclusions: z.array(z.string()).default([]),
  auditorAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  auditorName: z.string().min(1),
  auditDocHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "keccak256 hex"),
  ipfsCid: z.string().min(1),
  validityDays: z.number().int().positive().max(1825),
  tokenUri: z.string().min(1),
});

export const mintRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: unknown }>(
    "/certificates/mint",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!relayer) {
        return reply.code(503).send({ error: "Relayer wallet not configured" });
      }

      const parsed = MintBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
      }
      const b = parsed.data;

      // Enforce workflow: if an application is referenced, it must be APPROVED.
      if (b.applicationId) {
        // Look up in Postgres; fall back to in-memory store (demo, no DB).
        const appId = b.applicationId;
        const app = (await prisma.application
          .findUnique({ where: { id: appId } })
          .catch(() => null)) ?? memoryStore.findUnique(appId);
        if (!app) {
          return reply.code(409).send({ error: "Unknown applicationId" });
        }
        if (app.status !== "APPROVED") {
          return reply
            .code(409)
            .send({ error: `Application is '${app.status}', expected 'APPROVED'` });
        }
        // Mark MINTING so concurrent approvals can't double-mint.
        await prisma.application
          .update({ where: { id: b.applicationId }, data: { status: "MINTING" } })
          .catch(() => memoryStore.update(appId, "MINTING"));
      }

      // bytes2 from ISO code: "ZA" -> 0x5a41
      const countryBytes2 = ("0x" +
        Buffer.from(b.countryCode, "utf8").toString("hex").padEnd(4, "0").slice(0, 4)) as `0x${string}`;
      // Commitment to the off-chain PII record (keccak256 of registration + country).
      const businessDataHash = keccak256(
        stringToHex(`${b.registrationNumber}:${b.countryCode}`)
      ) as `0x${string}`;

      let result;
      try {
        result = await issueOnChain({
          to: b.to as `0x${string}`,
          businessName: b.businessName,
          registrationNumber: b.registrationNumber,
          countryCode: countryBytes2,
          businessDataHash,
          category: b.category,
          productLine: b.productLine,
          standard: b.standard,
          exclusions: b.exclusions,
          auditorAddress: b.auditorAddress as `0x${string}`,
          auditorName: b.auditorName,
          auditDocHash: b.auditDocHash as `0x${string}`,
          ipfsCid: b.ipfsCid,
          auditDate: Math.floor(Date.now() / 1000),
          validityDays: b.validityDays,
          tokenUri: b.tokenUri,
        });
      } catch (err) {
        // Roll the application back to APPROVED so it can be retried.
        if (b.applicationId) {
          const id = b.applicationId;
          await prisma.application
            .update({ where: { id }, data: { status: "APPROVED" } })
            .catch(() => memoryStore.update(id, "APPROVED"));
        }
        request.log.error(err, "on-chain mint failed");
        return reply.code(502).send({ error: "On-chain mint failed" });
      }

      // Hydrate off-chain mirrors. Non-fatal if DB is unavailable.
      try {
        const issuedAt = new Date();
        const expiresAt = new Date(issuedAt.getTime() + b.validityDays * 24 * 60 * 60 * 1000);
        const appId = b.applicationId ?? `pending_${result.txHash}`;
        await prisma.$transaction([
          prisma.certificate.create({
            data: {
              tokenId: Number(result.tokenId),
              applicationId: appId,
              category: b.category,
              standard: b.standard,
              countryCode: b.countryCode,
              auditorName: b.auditorName,
              issuedAt,
              expiresAt,
              ipfsCid: b.ipfsCid,
              auditDocHash: b.auditDocHash,
              polygonTxHash: result.txHash,
              tokenUri: b.tokenUri,
            },
          }),
          ...(b.applicationId
            ? [
                prisma.application.update({
                  where: { id: b.applicationId },
                  data: { status: "MINTED" },
                }),
              ]
            : []),
        ]);
      } catch {
        // DB offline (or in-memory mode): still created on-chain. Persist status
        // in the memory store so the loop stays consistent in demos.
        if (b.applicationId) memoryStore.update(b.applicationId, "MINTED");
        request.log.warn("DB hydration skipped (mirrors not persisted)");
      }

      return reply.code(201).send({
        tokenId: Number(result.tokenId),
        txHash: result.txHash,
        verifyUrl: `/api/verify/${Number(result.tokenId)}`,
      });
    }
  );
};
