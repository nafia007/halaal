"use client";

import { useEffect, useState } from "react";
import { Stepper, Field, inputCls } from "../../../components/Stepper";
import { Button } from "../../../components/Button";
import { StatusBadge } from "../../../components/StatusBadge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

type App = {
  id: string;
  businessName: string;
  registrationNumber: string;
  countryCode: string;
  categoryId: string;
  standard: string;
  status: string;
  submittedAt: string | null;
};

type AppStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "AUDIT_SCHEDULED"
  | "AUDIT_COMPLETE"
  | "APPROVED"
  | "MINTING"
  | "MINTED"
  | "REJECTED";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export default function ApplicationsAdmin() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [mint, setMint] = useState<{ appId: string; auditor: string } | null>(null);
  const [mintResult, setMintResult] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/applications`, {
        headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
      });
      const body = await res.json();
      setApps(body.applications ?? []);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, status: AppStatus) {
    setBusy(id);
    await fetch(`${API_BASE}/api/applications/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    setBusy(null);
    load();
  }

  async function doMint() {
    if (!mint) return;
    setBusy(mint.appId);
    const res = await fetch(`${API_BASE}/api/certificates/mint`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        applicationId: mint.appId,
        to: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        businessName: apps.find((a) => a.id === mint.appId)?.businessName ?? "Business",
        registrationNumber: apps.find((a) => a.id === mint.appId)?.registrationNumber ?? "N/A",
        countryCode: apps.find((a) => a.id === mint.appId)?.countryCode ?? "ZA",
        category: apps.find((a) => a.id === mint.appId)?.categoryId ?? "Food & Beverage",
        productLine: "As declared in application",
        standard: apps.find((a) => a.id === mint.appId)?.standard ?? "SANHA",
        auditorAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        auditorName: "Sheikh Mohammed Al-Rashid",
        auditDocHash: "0x9c3b1f7a2e4d6c8b5a0e1f2d3c4b5a6e7f8d9c0b1a2e3f4d5c6b7a8e9f0a1b2c",
        ipfsCid: "QmAuditPending",
        validityDays: 365,
        tokenUri: "ipfs://QmPending",
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    setMint(null);
    setMintResult(body.tokenId ? `Minted token #${body.tokenId}` : body.error ?? "Mint failed");
    load();
  }

  return (
    <div className="container-page max-w-4xl py-14">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Certifying body admin</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Applications</h1>
        </div>
        <Button variant="ghost" onClick={load}>
          Refresh
        </Button>
      </div>

      {mintResult && (
        <p className="mt-5 rounded-lg bg-moss/10 px-4 py-3 text-sm font-medium text-moss-dark">
          {mintResult}
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-xl2 border border-ink/10 bg-white shadow-card">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-ink/10 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slatey">
          <span>Business</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {loading && <p className="px-6 py-8 text-sm text-slatey">Loading…</p>}
        {!loading && apps.length === 0 && (
          <p className="px-6 py-8 text-sm text-slatey">
            No applications yet. Submit one from <a href="/apply" className="text-moss-dark underline">/apply</a>.
          </p>
        )}

        {apps.map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-ink/5 px-6 py-4 text-sm last:border-0"
          >
            <div>
              <p className="font-medium">{a.businessName}</p>
              <p className="text-xs text-slatey">
                {a.registrationNumber} · {a.countryCode} · {a.categoryId}
              </p>
            </div>
            <StatusBadge status={a.status === "MINTED" ? "VALID" : a.status} />
            <div className="flex justify-end gap-2">
              {a.status !== "APPROVED" && a.status !== "MINTED" && a.status !== "REJECTED" && (
                <button
                  disabled={busy === a.id}
                  onClick={() => setStatus(a.id, "APPROVED")}
                  className="rounded-full border border-moss/30 px-3 py-1.5 text-xs font-medium text-moss-dark transition-colors hover:bg-moss/10"
                >
                  Approve
                </button>
              )}
              {a.status === "APPROVED" && (
                <button
                  disabled={busy === a.id}
                  onClick={() => setMint({ appId: a.id, auditor: "" })}
                  className="rounded-full bg-moss px-3 py-1.5 text-xs font-medium text-paper transition-colors hover:bg-moss-dark"
                >
                  Mint
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {mint && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={() => setMint(null)}>
          <div
            className="w-full max-w-md rounded-xl2 border border-ink/10 bg-white p-7 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-xl font-semibold">Mint certificate</h2>
            <p className="mt-1 text-sm text-slatey">
              Approves on-chain issuance for {apps.find((a) => a.id === mint.appId)?.businessName}.
            </p>
            <div className="mt-5">
              <Field label="Auditor name">
                <input className={inputCls} defaultValue="Sheikh Mohammed Al-Rashid" disabled />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMint(null)}>
                Cancel
              </Button>
              <Button onClick={doMint} disabled={busy === mint.appId}>
                Confirm mint
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
