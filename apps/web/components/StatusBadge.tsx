import type { ReactNode } from "react";

export type Tone = "valid" | "expired" | "revoked" | "superseded" | "unknown";

const toneStyles: Record<Tone, { dot: string; bg: string; text: string; label: string }> = {
  valid: { dot: "bg-moss", bg: "bg-moss/10", text: "text-moss-dark", label: "Valid" },
  expired: { dot: "bg-clay", bg: "bg-clay/10", text: "text-clay", label: "Expired" },
  revoked: { dot: "bg-rust", bg: "bg-rust/10", text: "text-rust", label: "Revoked" },
  superseded: { dot: "bg-slatey", bg: "bg-slatey/10", text: "text-slatey", label: "Superseded" },
  unknown: { dot: "bg-slatey", bg: "bg-slatey/10", text: "text-slatey", label: "Unknown" },
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const tone = (toneStyles as any)[status?.toLowerCase()] ?? toneStyles.unknown;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone.bg} ${tone.text} ${className}`}
    >
      <span className={`dot ${tone.dot}`} />
      {tone.label}
    </span>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-ink/10 bg-white/60 px-3 py-1 text-xs font-medium text-slatey ${className}`}
    >
      {children}
    </span>
  );
}
