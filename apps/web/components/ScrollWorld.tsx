"use client";

import { ReactNode, useEffect, useState } from "react";
import { motion, MotionValue, useMotionValue, useTransform, useSpring } from "framer-motion";

function useScrollProgress() {
  const p = useMotionValue(0);
  useEffect(() => {
    const handler = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      p.set(max > 0 ? window.scrollY / max : 0);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [p]);
  return p;
}

function SceneLayer({ src, index, total, scrollT }: {
  src: string; index: number; total: number; scrollT: MotionValue<number>;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const opacity = useTransform(
    scrollT,
    [Math.max(0, start - 0.05), start, end, Math.min(1, end + 0.05)],
    [0, 1, 1, 0]
  );
  const localP = useTransform(scrollT, [start, end], [0, 1]);
  const scale = useTransform(localP, [0, 1], [1.0, 1.04]);
  const y = useTransform(localP, [0, 1], [0, 0]);
  return (
    <motion.div className="absolute inset-0" style={{ opacity }}>
      <motion.img src={src} style={{ scale, y }} className="h-full w-full object-cover" draggable={false} alt="" />
    </motion.div>
  );
}

type Pos =
  | "left-center"
  | "right-top"
  | "right-bottom"
  | "bottom-center"
  | "top-left"
  | "center";

function GlassOverlay({ children, range, pos = "left-center", scrollT }: {
  children: ReactNode; range: [number, number]; pos?: Pos; scrollT: MotionValue<number>;
}) {
  const [start, end] = range;
  const fadeIn = Math.max(0, start - 0.04);
  const fadeOut = Math.min(1, end + 0.04);
  const opacity = useTransform(scrollT, [fadeIn, start, end, fadeOut], [0, 1, 1, 0]);
  const y = useTransform(scrollT, [fadeIn, start, end, fadeOut], [30, 0, 0, -20]);

  const posClass: Record<Pos, string> = {
    "left-center": "items-center justify-start sm:pl-16 lg:pl-24",
    "right-top": "items-start justify-end sm:pr-16 lg:pr-24 pt-20 sm:pt-28",
    "right-bottom": "items-end justify-end sm:pr-16 lg:pr-24 pb-20 sm:pb-28",
    "bottom-center": "items-end justify-center pb-24 sm:pb-28",
    "top-left": "items-start justify-start sm:pl-16 lg:pl-24 pt-20 sm:pt-28",
    "center": "items-center justify-center",
  };

  return (
    <motion.div
      className={`pointer-events-none absolute inset-0 z-20 flex ${posClass[pos]}`}
      style={{ opacity, y }}
    >
      <motion.div
        className="pointer-events-auto max-w-lg rounded-2xl border border-white/10 p-7 sm:p-10"
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function ScrollWorld() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const raw = useScrollProgress();
  const t = useSpring(raw, { stiffness: 18, damping: 45, mass: 1.2 });

  if (!mounted) return <div className="h-screen bg-black" />;

  return (
    <>
      <div className="fixed inset-0 z-0 bg-black">
        <SceneLayer src="https://skiy9cizul.ufs.sh/f/kOxGBlH1ZBglWfCSMO9Juv5DnMhVU8tBT3QGAfj9mWzkEy4S" index={0} total={6} scrollT={t} />
        <SceneLayer src="https://skiy9cizul.ufs.sh/f/kOxGBlH1ZBglSBtOB1xLtAIc9i3WGmnyUHPDu61QXf75VYTk" index={1} total={6} scrollT={t} />
        <SceneLayer src="https://skiy9cizul.ufs.sh/f/kOxGBlH1ZBglZmRvqLJUx0DY86sBwNeb9LSyjniOGoFQk5RE" index={2} total={6} scrollT={t} />
        <SceneLayer src="https://skiy9cizul.ufs.sh/f/kOxGBlH1ZBglxM1LKh8RlcprI79XCgOLZuHxQe6DP4J3o2ij" index={3} total={6} scrollT={t} />
        <SceneLayer src="https://skiy9cizul.ufs.sh/f/kOxGBlH1ZBglr1FU0Ep9ougVNXT8S7PfUDldLhM1R4Fwexib" index={4} total={6} scrollT={t} />
        <SceneLayer src="https://skiy9cizul.ufs.sh/f/kOxGBlH1ZBglsLHwOoaYXiIhajsuc6vKLxNwZeW8o9dpn7gS" index={5} total={6} scrollT={t} />

        {/* Glass card overlays */}
        <GlassOverlay range={[0, 0.22]} pos="left-center" scrollT={t}>
          <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Polygon-anchored · ERC-721
          </span>
          <h2 className="mt-4 text-3xl font-semibold leading-[1.05] tracking-tight text-white sm:text-4xl">
            A certificate you can trust at a glance.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">
            Issue tamper-proof Halaal certificates as NFTs. Verify any of them in seconds — no login, no phone calls, no counterfeit risk.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/verify" className="inline-block rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#050505] transition-all hover:bg-white hover:scale-105 no-underline">
              Verify a certificate
            </a>
            <a href="/apply" className="inline-block rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 transition-all hover:border-white/40 hover:text-white no-underline">
              Apply for certification
            </a>
          </div>
        </GlassOverlay>

        <GlassOverlay range={[0.20, 0.45]} pos="right-bottom" scrollT={t}>
          <dl className="grid grid-cols-3 gap-6">
            {[
              { value: "< $0.01", label: "per mint" },
              { value: "2s", label: "finality" },
              { value: "300+", label: "bodies, one registry" },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{s.value}</dt>
                <dd className="mt-1 text-[11px] uppercase tracking-wide text-white/50">{s.label}</dd>
              </div>
            ))}
          </dl>
        </GlassOverlay>

        <GlassOverlay range={[0.40, 0.65]} pos="right-top" scrollT={t}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Certificate</p>
              <p className="mt-0.5 text-lg font-semibold text-white">Al-Baraka Foods</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-400/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-green-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
              VALID
            </span>
          </div>
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[82%] rounded-full bg-green-400" />
          </div>
          <p className="mt-2 text-xs text-white/50">364 days remaining · Food &amp; Beverage · SANHA</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[
              { label: "Standard", value: "SANHA" },
              { label: "Country", value: "South Africa" },
              { label: "Auditor", value: "S. Al-Rashid" },
              { label: "Token", value: "#42" },
            ].map((f) => (
              <div key={f.label}>
                <dt className="text-[11px] uppercase tracking-wide text-white/40">{f.label}</dt>
                <dd className="mt-0.5 font-medium text-white/80">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-xs text-white/50">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" /> Anchored on Polygon
            </span>
            <span className="font-mono">ipfs://QmAudit…</span>
          </div>
        </GlassOverlay>

        <GlassOverlay range={[0.60, 0.85]} pos="left-center" scrollT={t}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">How it works</p>
          <h3 className="mt-2 text-2xl font-semibold leading-tight text-white">From inspection to instant proof.</h3>
          <div className="mt-5 space-y-4">
            {[
              { n: "01", title: "Issue on-chain", body: "A certifying body mints each certificate as a soulbound ERC-721 NFT on Polygon." },
              { n: "02", title: "Inspect & audit", body: "The audit report is hashed and pinned to IPFS; the commitment is anchored on-chain." },
              { n: "03", title: "Verify in seconds", body: "A consumer scans the QR code and reads the live status straight from the contract." },
            ].map((s) => (
              <div key={s.n} className="flex gap-4">
                <span className="mt-0.5 font-serif text-lg font-semibold text-white/40">{s.n}</span>
                <div>
                  <p className="text-sm font-medium text-white/90">{s.title}</p>
                  <p className="mt-0.5 text-xs text-white/50">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassOverlay>

        <GlassOverlay range={[0.82, 1]} pos="bottom-center" scrollT={t}>
          <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            04 — 04
          </span>
          <h3 className="mt-2 text-2xl font-semibold leading-tight text-white">Make every certificate impossible to forge.</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Whether you issue certifications or simply need to trust one — the registry is public, free to query, and live on Polygon.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/verify" className="inline-block rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#050505] transition-all hover:bg-white hover:scale-105 no-underline">
              Verify now
            </a>
            <a href="/apply" className="inline-block rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/25 no-underline">
              Get certified
            </a>
          </div>
        </GlassOverlay>

        <GlassOverlay range={[0.82, 1]} pos="top-left" scrollT={t}>
          <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            05 — 05
          </span>
          <h3 className="mt-2 text-2xl font-semibold leading-tight text-white">The trust layer for every Halaal body.</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            One unified registry. One scan. Zero doubt.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/verify" className="inline-block rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#050505] transition-all hover:bg-white hover:scale-105 no-underline">
              Verify now
            </a>
          </div>
        </GlassOverlay>
      </div>

      <div className="relative z-0 h-[600vh]" />
    </>
  );
}
