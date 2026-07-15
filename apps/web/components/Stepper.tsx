"use client";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-semibold transition-colors ${
                done
                  ? "bg-moss text-paper"
                  : active
                    ? "border-2 border-moss text-moss"
                    : "border border-ink/15 text-slatey"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-sm ${active ? "font-medium text-ink" : "text-slatey"}`}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-ink/10" />}
          </li>
        );
      })}
    </ol>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint && <span className="ml-2 text-xs text-slatey">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-moss";
