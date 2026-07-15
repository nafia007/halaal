# Halaal Platform (Monorepo)

Blockchain-anchored Halaal certification SaaS. Every certificate is an ERC-721
NFT on Polygon; the web/mobile/API tiers deliver the user experience for
Certification Bodies, Businesses, Auditors, and Consumers.

> Status: **Phase 0 + Verify slice scaffolded and verified end-to-end.**
> See the PRD (`halaal-prd.md`) for full requirements.

## Layout

```
packages/contracts/   Solidity HalaalCertification.sol (Hardhat + tests)
packages/db/          Prisma schema (off-chain state, PostgreSQL)
apps/api/             Fastify REST API  →  GET /api/verify/:tokenId, POST /certificates/mint
apps/web/             Next.js 14 marketing site + consumer verify experience (no login)
```

## Frontend design

The web app is a composed product UI, not a template:
- **Type system**: Fraunces (display serif) + Inter (UI sans) via `next/font`.
- **Palette**: warm paper `#faf8f4`, ink `#16140f`, single green accent (`moss` `#0c7a4d`);
  status uses restrained tones (valid/expired/revoked/superseded) rather than rainbow gradients.
- **Structure**: landing (hero, trust strip, how-it-works, for-issuers, categories, FAQ, CTA),
  shared `NavBar`/`Footer`, composed `Button`/`StatusBadge`/`Card` primitives, and a
  `/verify/[tokenId]` experience with skeleton + not-found states.

## What's implemented & verified

- **Smart contract** — revised `HalaalCertification.sol`:
  soulbound ERC-721, no on-chain PII (only a `businessDataHash` commitment),
  renewal **supersession** (no double-valid window), issuer-scoped
  revoke/renew, revoke-while-paused. 37 Hardhat tests, 100% function coverage.
- **DB schema** — Prisma models aligned to the revised contract (PII lives off-chain).
- **API** — `GET /api/verify/:tokenId` reads on-chain state via viem and
  enriches with the off-chain DB record; 100 req/min rate limit.
- **Web** — consumer verify page: status badge (VALID/EXPIRED/REVOKED/SUPERSEDED),
  days-remaining bar, certificate details, IPFS + PolygonScan links, manual lookup.

## Run the verify slice (local)

```bash
# 1. Contract — start a local node, deploy, seed two certs
cd packages/contracts
npx hardhat node                      # terminal A
npx hardhat run scripts/deploy.ts --network localhost   # or local-seed.ts
export CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# 2. API — point at the local node
cd ../../apps/api
CHAIN_ID=31337 AMOY_RPC_URL=http://127.0.0.1:8545 \
  POLYGON_RPC_URL=http://127.0.0.1:8545 CONTRACT_ADDRESS=$CONTRACT_ADDRESS \
  DATABASE_URL=postgresql://user:pass@localhost:5432/halaal \
  npx tsx src/index.ts

# 3. Try it
curl http://localhost:3001/api/verify/1      # VALID
curl http://localhost:3001/api/verify/2      # REVOKED
curl -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/verify/999  # 404

# 4. Web (separate terminal)
cd apps/web && NEXT_PUBLIC_API_BASE=http://localhost:3001 npx next dev
# open http://localhost:3000/verify/1
```

## Notes / decisions

- Solidity pinned to **0.8.20** with `@openzeppelin/contracts@5.0.2` (the v5 line
  targeting `^0.8.20`) per the PRD. Newer OZ (5.4+) requires 0.8.24.
- `viem` pinned to **2.21.1** so its transitive `ox` types compile under TS 5.7+.
- A running PostgreSQL is **not** required for verification — the API falls back
  to on-chain data if the DB is unreachable or the record isn't hydrated yet.

## Not yet built (next phases)

Application portal, body admin portal, auditor mobile app, relayer minting,
Stripe, IPFS pipeline, WebSocket updates, i18n, multisig admin, subgraph.

## Minting model (as built)

- **Gas abstraction**: the platform pays gas via a funded **relayer wallet**
  (`RELAYER_PRIVATE_KEY`), not the end user. The relayer holds `CERTIFIER_ROLE`;
  the contract still enforces that only certifiers can mint.
- **Gated endpoint**: `POST /certificates/mint` requires `Authorization: Bearer <HALAAL_API_KEY>`
  (stands in for the Auth.js certifier session) and, when an `applicationId` is
  supplied, only proceeds if that application is `APPROVED`.
- **Still to harden before testnet**: relayer key in **AWS KMS / Vault** (§10 P0),
  `DEFAULT_ADMIN_ROLE` as a **3-of-5 Gnosis Safe** (§6.6 P0), and wiring the
  business application → admin approve → mint UI (currently the mint is callable
  directly; the application wizard is the next piece).
