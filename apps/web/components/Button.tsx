import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-moss text-paper hover:bg-moss-dark focus-visible:ring-moss/40",
  secondary:
    "bg-ink text-paper hover:bg-ink/90 focus-visible:ring-ink/30",
  ghost:
    "bg-transparent text-ink hover:bg-ink/5 focus-visible:ring-ink/20 border border-ink/15",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  href,
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  href?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 ${styles[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
