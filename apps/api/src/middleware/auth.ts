import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Bearer-token auth for privileged actions (mint, revoke, admin).
 *
 * In production this is the certifying-body operator's credential, issued by
 * the Auth.js session. Here we accept a shared secret (`HALAAL_API_KEY`) so the
 * gate is real and testable without a full identity provider.
 *
 * The on-chain contract additionally requires the caller to hold CERTIFIER_ROLE;
 * the relayer wallet is the only one granted that role, so a leaked API key
 * still can't mint on-chain unless the relayer key is also compromised.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const expected = process.env.HALAAL_API_KEY;
  if (!expected) {
    // Misconfiguration: fail closed in any non-dev environment.
    if (process.env.NODE_ENV === "production") {
      return reply.code(500).send({ error: "Server auth not configured" });
    }
    return; // dev: allow unauthenticated
  }

  const header = request.headers["authorization"] ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token || token !== expected) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

export function authOpts() {
  return { preHandler: requireAuth };
}
