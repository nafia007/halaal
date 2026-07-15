import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { verifyRoutes } from "./routes/verify";
import { mintRoutes } from "./routes/mint";
import { applicationRoutes } from "./routes/applications";

export async function buildApp() {
  const app = Fastify({ logger: true });

  // Rate limit public endpoints — 100 req/min per IP (PRD §10).
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    timeWindow: "1 minute",
  });

  // Restrict CORS to known web origins. Comma-separated list in
  // ALLOWED_ORIGINS; falls back to the local web dev origin.
  const allowed = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  await app.register(cors, {
    origin: allowed.length === 1 ? allowed[0] : allowed,
  });

  await app.register(verifyRoutes, { prefix: "/api" });
  await app.register(mintRoutes, { prefix: "/api" });
  await app.register(applicationRoutes, { prefix: "/api" });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}

async function main() {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3001);
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
