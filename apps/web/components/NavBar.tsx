"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { HowItWorksSheet } from "./HowItWorksSheet";

export function NavBar() {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home" },
    { href: "/verify", label: "Verify" },
    { href: "/apply", label: "Apply" },
    { href: "/#issuers", label: "For certifiers" },
    { href: "/#categories", label: "Standards" },
  ];
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/80 backdrop-blur-md">
        <nav className="container-page flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-moss text-paper">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M5 12.5 10 17l9-10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-serif text-lg font-semibold tracking-tight">Halaal</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm text-slatey md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`transition-colors hover:text-ink ${pathname === l.href ? "text-ink" : ""}`}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => setShowHowItWorks(true)}
              className="text-sm font-medium text-slatey hover:text-ink transition-colors"
            >
              How it works
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="rounded-full bg-moss px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-moss-dark"
            >
              Verify a certificate
            </Link>
            <SignInButton mode="modal">
              <button className="hidden md:inline-block rounded-full bg-moss px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-moss-dark">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="hidden md:inline-block rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5">
                Sign up
              </button>
            </SignUpButton>
            <UserButton />
          </div>
        </nav>
      </header>
      <HowItWorksSheet isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </>
  );
}
