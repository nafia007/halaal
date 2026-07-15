"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper, Field, inputCls } from "../../components/Stepper";
import { Button } from "../../components/Button";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

const STEPS = ["Business", "Scope", "Contact", "Review"];
const COUNTRIES = ["ZA", "MY", "ID", "AE", "SA", "NG", "PK", "TR", "GB", "US"];
const CATEGORIES = [
  "Food & Beverage",
  "Cosmetics & Personal Care",
  "Pharmaceuticals & Nutraceuticals",
  "Islamic Finance",
  "Logistics & Cold Chain",
  "Restaurant & Catering",
  "Animal Feed & Agriculture",
  "E-commerce & Marketplace",
];
const STANDARDS: Record<string, string[]> = {
  ZA: ["SANHA", "MJC"],
  MY: ["JAKIM"],
  ID: ["MUI"],
  AE: ["ESMA"],
  SA: ["SFDA"],
  NG: ["NAFDAC"],
  PK: ["PHDEB"],
  TR: ["GIMDES"],
  GB: ["HMC", "HFA-UK"],
  US: ["HFA", "IFANCA"],
};

const empty = {
  businessName: "",
  registrationNumber: "",
  countryCode: "ZA",
  category: CATEGORIES[0],
  productLine: "",
  standard: "SANHA",
  physicalAddress: "",
  contactEmail: "",
};

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid =
    form.businessName && form.registrationNumber && form.productLine && form.contactEmail;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Submission failed (${res.status})`);
      const body = await res.json();
      setResult({ id: body.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="container-page max-w-2xl py-16">
        <div className="rounded-xl2 border border-ink/10 bg-white p-10 text-center shadow-card">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-moss/10 text-moss">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M5 12.5 10 17l9-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-5 font-serif text-2xl font-semibold">Application received</h1>
          <p className="mt-2 text-slatey">
            Reference <span className="font-mono text-ink">{result.id.slice(0, 12)}…</span>. The
            certifying body will review and, once approved, mint your certificate on-chain.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Button href="/verify" variant="ghost">
              Verify a certificate
            </Button>
            <Button href="/">Back home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-2xl py-14">
      <p className="eyebrow">Certification application</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight">
        Apply for Halaal certification
      </h1>
      <p className="mt-2 text-slatey">
        A few details to start your application. You&apos;ll track status from submission to mint.
      </p>

      <div className="mt-8 rounded-xl2 border border-ink/10 bg-white p-7 shadow-card sm:p-9">
        <Stepper steps={STEPS} current={step} />

        <div className="mt-8 space-y-5">
          {step === 0 && (
            <>
              <Field label="Legal business name">
                <input
                  className={inputCls}
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                  placeholder="e.g. Al-Baraka Foods (Pty) Ltd"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Registration number" hint="national business ID">
                  <input
                    className={inputCls}
                    value={form.registrationNumber}
                    onChange={(e) => set("registrationNumber", e.target.value)}
                    placeholder="e.g. 2018/034521/07"
                  />
                </Field>
                <Field label="Country">
                  <select
                    className={inputCls}
                    value={form.countryCode}
                    onChange={(e) => {
                      set("countryCode", e.target.value);
                      set("standard", STANDARDS[e.target.value]?.[0] ?? form.standard);
                    }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Certificate category">
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Product line / scope" hint="what this certificate covers">
                <input
                  className={inputCls}
                  value={form.productLine}
                  onChange={(e) => set("productLine", e.target.value)}
                  placeholder="e.g. Processed poultry — all SKUs"
                />
              </Field>
              <Field label="Standard / certifying body">
                <select
                  className={inputCls}
                  value={form.standard}
                  onChange={(e) => set("standard", e.target.value)}
                >
                  {(STANDARDS[form.countryCode] ?? [form.standard]).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Physical address">
                <input
                  className={inputCls}
                  value={form.physicalAddress}
                  onChange={(e) => set("physicalAddress", e.target.value)}
                  placeholder="Street, city"
                />
              </Field>
              <Field label="Contact email">
                <input
                  type="email"
                  className={inputCls}
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                  placeholder="applications@business.com"
                />
              </Field>
              <p className="rounded-lg bg-sand/60 px-4 py-3 text-xs text-slatey">
                Documents (ingredient lists, supplier certs, facility photos) are uploaded after
                submission in the next phase. This wizard collects the on-chain identity fields.
              </p>
            </>
          )}

          {step === 3 && (
            <dl className="divide-y divide-ink/10 text-sm">
              {[
                ["Business", form.businessName],
                ["Registration no.", form.registrationNumber],
                ["Country", form.countryCode],
                ["Category", form.category],
                ["Product line", form.productLine],
                ["Standard", form.standard],
                ["Contact", form.contactEmail],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5">
                  <dt className="text-slatey">{k}</dt>
                  <dd className="max-w-[60%] text-right font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {error && <p className="mt-5 text-sm text-rust">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-full px-4 py-2 text-sm font-medium text-slatey transition-colors enabled:hover:bg-ink/5 disabled:opacity-40"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={submit} disabled={!valid || submitting}>
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
