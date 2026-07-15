import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma, memoryStore } from "@halaal/db";
import { requireAuth } from "../middleware/auth";

const CreateApp = z.object({
  businessName: z.string().min(1),
  registrationNumber: z.string().min(1),
  countryCode: z.string().length(2, "ISO 3166-1 alpha-2, e.g. ZA"),
  category: z.string().min(1),
  productLine: z.string().min(1),
  standard: z.string().min(1),
  physicalAddress: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

const StatusUpdate = z.object({
  status: z.enum([
    "SUBMITTED",
    "IN_REVIEW",
    "AUDIT_SCHEDULED",
    "AUDIT_COMPLETE",
    "APPROVED",
    "REJECTED",
    "MINTING",
    "MINTED",
  ]),
});

export const applicationRoutes: FastifyPluginAsync = async (fastify) => {
  // Business submits a new application.
  fastify.post<{ Body: unknown }>("/applications", async (request, reply) => {
    const parsed = CreateApp.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const b = parsed.data;

    const base = {
      businessName: b.businessName,
      registrationNumber: b.registrationNumber,
      countryCode: b.countryCode,
      categoryId: b.category,
      productLine: b.productLine,
      standard: b.standard,
      physicalAddress: b.physicalAddress,
      contactEmail: b.contactEmail,
    };

    // Try Postgres first; fall back to in-memory when no DB is configured.
    try {
      const app = await prisma.application.create({
        data: { ...base, status: "SUBMITTED", submittedAt: new Date() },
      });
      return reply.code(201).send({ id: app.id, status: app.status });
    } catch {
      const rec = memoryStore.create(base);
      return reply.code(201).send({ id: rec.id, status: rec.status, storage: "memory" });
    }
  });

  // List applications (admin/certifier).
  fastify.get("/applications", { preHandler: requireAuth }, async (_request, reply) => {
    try {
      const apps = await prisma.application.findMany({
        select: {
          id: true,
          businessName: true,
          registrationNumber: true,
          categoryId: true,
          status: true,
          submittedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return reply.send({ applications: apps });
    } catch {
      return reply.send({ applications: memoryStore.list(), storage: "memory" });
    }
  });

  // Update workflow status (admin/certifier).
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    "/applications/:id/status",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = StatusUpdate.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid status" });
      }
      try {
        const app = await prisma.application.update({
          where: { id: request.params.id },
          data: { status: parsed.data.status },
        });
        return reply.send({ id: app.id, status: app.status });
      } catch {
        const rec = memoryStore.update(request.params.id, parsed.data.status);
        if (!rec) return reply.code(404).send({ error: "Unknown application" });
        return reply.send({ id: rec.id, status: rec.status, storage: "memory" });
      }
    }
  );
};
