import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: Readonly<{
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p> : null}
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Button({ className = "", ...props }: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function MetricCard({
  label,
  value,
  detail
}: Readonly<{
  label: string;
  value: string;
  detail: string;
}>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral"
}: Readonly<{ children: ReactNode; tone?: "neutral" | "good" | "warning" | "danger" }>) {
  const toneClass = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    good: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700"
  }[tone];

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>{children}</span>;
}
