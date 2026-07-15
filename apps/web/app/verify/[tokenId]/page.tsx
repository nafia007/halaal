"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "../../../components/StatusBadge";
import { QrCode, downloadCanvas } from "../../../components/QrCode";
import type { VerifyResponse, CertStatus } from "../../../lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

export default function VerifyPage({ params }: { params: { tokenId: string } }) {
  const router = useRouter();
  const tokenId = params.tokenId;
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");
  const qrRef = useRef<HTMLCanvasElement | null>(null);

  async function load(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/verify/${id}`);
      if (res.status === 404) {
        setData(null);
        setError("No certificate exists for that token ID.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenId) load(tokenId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId]);

  const status: CertStatus = data?.status ?? "NOT_FOUND";

  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      {/* Lookup */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = lookup.trim();
          if (v) router.push(`/verify/${v}`);
        }}
      >
        <input
          value={lookup}
          onChange={(e) => setLookup(e.target.value)}
          inputMode="numeric"
          placeholder="Enter a certificate token ID, e.g. 42"
          className="flex-1 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm outline-none transition-colors focus:border-moss"
        />
        <button
          type="submit"
          className="rounded-full bg-moss px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-moss-dark"
        >
          Look up
        </button>
      </form>

      <p className="mt-3 text-xs text-slatey">
        Public verification — no account required. Scan the QR on a product to land here directly.
      </p>

      <div className="mt-8">
        {loading && <Skeleton />}

        {!loading && error && !data && (
          <div className="rounded-xl2 border border-ink/10 bg-white p-8 text-center shadow-card">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-rust/10 text-rust">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 8v5m0 3h.01" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <p className="mt-4 font-medium text-ink">{error}</p>
            <p className="mt-1 text-sm text-slatey">Check the token ID and try again.</p>
          </div>
        )}

        {!loading && data && (
          <div className="animate-rise rounded-xl2 border border-ink/10 bg-white p-7 shadow-card sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge status={status} />
              <span className="text-xs text-slatey">Token #{data.tokenId}</span>
            </div>

            <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight">
              {data.businessName || "—"}
            </h1>
            <p className="mt-1 text-slatey">
              {data.category} · {data.standard} · {data.countryCode}
            </p>
            {data.productLine && (
              <p className="mt-1 text-sm text-slatey">{data.productLine}</p>
            )}

            {status === "VALID" && (
              <div className="mt-7">
                <div className="flex items-center justify-between text-xs text-slatey">
                  <span>Validity</span>
                  <span className="font-medium text-ink">{data.daysRemaining} days remaining</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sand">
                  <div
                    className={`h-full rounded-full ${barColor(data.daysRemaining)}`}
                    style={{ width: `${Math.min(100, (data.daysRemaining / 365) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-ink/10 pt-7 text-sm">
              <Detail label="Issued" value={fmt(data.issuedAt)} />
              <Detail label="Expires" value={fmt(data.expiresAt)} />
              <Detail label="Auditor" value={data.auditorName || "—"} />
              <Detail label="Standard" value={data.standard} />
              {data.revokedAt && <Detail label="Revoked" value={fmt(data.revokedAt)} />}
              {data.revocationReason && (
                <Detail label="Revocation reason" value={data.revocationReason} full />
              )}
              {data.renewalCount ? <Detail label="Renewals" value={String(data.renewalCount)} /> : null}
            </dl>

            {(data.ipfsCid || data.polygonTxHash) && (
              <div className="mt-7 space-y-2 border-t border-ink/10 pt-6 text-sm">
                {data.ipfsCid && (
                  <a
                    href={`https://ipfs.io/ipfs/${data.ipfsCid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg bg-sand/60 px-4 py-3 text-ink/80 transition-colors hover:bg-sand"
                  >
                    <span className="font-medium">Audit document (IPFS)</span>
                    <span className="truncate font-mono text-xs text-slatey">{data.ipfsCid}</span>
                  </a>
                )}
                {data.polygonTxHash && (
                  <a
                    href={`https://amoy.polygonscan.com/tx/${data.polygonTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg bg-sand/60 px-4 py-3 text-ink/80 transition-colors hover:bg-sand"
                  >
                    <span className="font-medium">Mint transaction</span>
                    <span className="truncate font-mono text-xs text-slatey">
                      {shorten(data.polygonTxHash)}
                    </span>
                  </a>
                )}
              </div>
            )}

            {/* QR + actions */}
            <div className="mt-7 grid gap-6 border-t border-ink/10 pt-7 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-xl border border-ink/10 bg-white p-3 shadow-sm">
                  <QrCode
                    onReady={(c) => (qrRef.current = c)}
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify/${data.tokenId}`}
                    size={140}
                  />
                </div>
                <span className="text-[11px] uppercase tracking-wide text-slatey">Scan to verify</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => downloadCanvas(qrRef.current, `halaal-cert-${data.tokenId}.png`)}
                  className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-ink/5"
                >
                  Download QR
                </button>
                <button className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-ink/5">
                  Report an issue
                </button>
                <button className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-ink/5">
                  Share
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-[11px] uppercase tracking-wide text-slatey">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-xl2 border border-ink/10 bg-white p-9 shadow-card">
      <div className="h-6 w-20 rounded-full bg-sand" />
      <div className="mt-5 h-6 w-1/2 rounded bg-sand" />
      <div className="mt-3 h-4 w-1/3 rounded bg-sand/70" />
      <div className="mt-7 h-2 w-full rounded-full bg-sand" />
      <div className="mt-7 grid grid-cols-2 gap-5 border-t border-ink/10 pt-7">
        <div className="h-10 rounded bg-sand/70" />
        <div className="h-10 rounded bg-sand/70" />
      </div>
    </div>
  );
}

function barColor(days: number): string {
  if (days <= 30) return "bg-clay";
  return "bg-moss";
}

function fmt(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function shorten(h: string): string {
  return h.length > 16 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h;
}
