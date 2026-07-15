import Link from "next/link";

const cols = [
  {
    title: "Product",
    links: [
      { href: "/verify", label: "Verify" },
      { href: "/#how", label: "How it works" },
      { href: "/#issuers", label: "For certifiers" },
      { href: "/#categories", label: "Standards" },
    ],
  },
  {
    title: "Network",
    links: [
      { href: "/#issuers", label: "Certifying bodies" },
      { href: "/#standards", label: "Jurisdictions" },
      { href: "/#trust", label: "On-chain audit" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/verify", label: "API status" },
      { href: "/#faq", label: "FAQ" },
      { href: "/#contact", label: "Contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/10 bg-sand/50">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-moss text-paper">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M5 12.5 10 17l9-10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-serif text-lg font-semibold tracking-tight">Halaal</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-slatey">
            Tamper-proof Halaal certification, anchored on Polygon. One trusted endpoint for every
            certificate, regardless of issuing body.
          </p>
        </div>

        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slatey">{c.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-ink/80 transition-colors hover:text-moss-dark">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-page flex flex-col items-start justify-between gap-3 border-t border-ink/10 py-6 text-xs text-slatey sm:flex-row sm:items-center">
        <span>© {new Date().getFullYear()} Halaal Platform. Confidential.</span>
        <span className="flex items-center gap-2">
          <span className="dot bg-moss" /> Polygon mainnet · contract-verified
        </span>
      </div>
    </footer>
  );
}
