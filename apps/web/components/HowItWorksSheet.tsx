"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./Button";

const flow = [
  {
    step: "01",
    title: "Every certificate is on-chain",
    body: "Issued as a soulbound ERC-721 on Polygon. Issuer, scope, auditor and validity are written immutably — no two bodies share a format.",
  },
  {
    step: "02",
    title: "Audit, then anchor",
    body: "The audit report is hashed and pinned to IPFS; the keccak256 commitment is anchored on-chain. Anyone can prove the file hasn't been altered.",
  },
  {
    step: "03",
    title: "Verify in seconds",
    body: "A consumer scans the QR code and reads the live status — VALID, EXPIRED or REVOKED — straight from the contract. No account, no login.",
  },
];

type CardPos = "left-center" | "right-top" | "right-bottom" | "bottom-center" | "top-left" | "center";

const posClass: Record<CardPos, string> = {
  "left-center": "items-center justify-start sm:pl-16 lg:pl-24",
  "right-top": "items-start justify-end sm:pr-16 lg:pr-24 pt-16 sm:pt-24",
  "right-bottom": "items-end justify-end sm:pr-16 lg:pr-24 pb-16 sm:pb-24",
  "bottom-center": "items-end justify-center pb-16 sm:pb-24",
  "top-left": "items-start justify-start sm:pl-16 lg:pl-24 pt-16 sm:pt-24",
  "center": "items-center justify-center",
};

function GlassCard({
  children,
  pos,
  className = "",
}: {
  children: React.ReactNode;
  pos: CardPos;
  className?: string;
}) {
  return (
    <div className={`flex w-full ${posClass[pos]}`}>
      <motion.div
        className={`pointer-events-auto max-w-lg rounded-2xl border border-white/10 p-7 sm:p-9 ${className}`}
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
    </div>
  );
}

export function HowItWorksSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative z-10 w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 p-8 sm:p-12"
        style={{
          background: "rgba(5,5,5,0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Heading card */}
        <GlassCard pos="top-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">How it works</p>
          <h2 className="mt-4 max-w-md font-serif text-3xl font-semibold leading-[1.08] tracking-tight sm:text-4xl">
            From farm to fork, the trust is verifiable.
          </h2>
        </GlassCard>

        {/* Step 01 */}
        <GlassCard pos="right-top">
          <span className="font-serif text-2xl font-semibold text-white/40">{flow[0].step}</span>
          <h3 className="mt-4 text-xl font-semibold text-white">{flow[0].title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/65">{flow[0].body}</p>
        </GlassCard>

        {/* Step 02 */}
        <GlassCard pos="left-center">
          <span className="font-serif text-2xl font-semibold text-white/40">{flow[1].step}</span>
          <h3 className="mt-4 text-xl font-semibold text-white">{flow[1].title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/65">{flow[1].body}</p>
        </GlassCard>

        {/* Step 03 */}
        <GlassCard pos="right-bottom">
          <span className="font-serif text-2xl font-semibold text-white/40">{flow[2].step}</span>
          <h3 className="mt-4 text-xl font-semibold text-white">{flow[2].title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/65">{flow[2].body}</p>
        </GlassCard>

        {/* CTA card */}
        <GlassCard pos="bottom-center">
          <div className="flex flex-wrap items-center gap-3">
            <Button href="/verify" className="!bg-white/90 !text-[#050505] hover:!bg-white">
              Verify a certificate
            </Button>
            <Button
              href="/apply"
              variant="ghost"
              className="!border-white/20 !text-white/80 hover:!border-white/40 hover:!text-white"
            >
              Apply for certification
            </Button>
          </div>
        </GlassCard>

        {/* Trusted standards strip */}
        <div className="mt-6 border-t border-white/10 pt-6">
          <div className="flex flex-col items-start gap-4 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium text-white/80">Trusted standards, one registry:</span>
            <div className="flex flex-wrap gap-x-7 gap-y-2 font-serif text-base font-medium text-white/70">
              {["SANHA", "JAKIM", "MUI", "ESMA", "HFA", "GIMDES"].map((b) => (
                <span key={b}>{b}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Final image */}
        <div className="mt-10">
          <img
            src="https://skiy9cizul.ufs.sh/f/kOxGBlH1ZBglr1FU0Ep9ougVNXT8S7PfUDldLhM1R4Fwexib"
            alt=""
            className="w-full rounded-2xl border border-white/10 object-cover"
            style={{ aspectRatio: "16/9" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}