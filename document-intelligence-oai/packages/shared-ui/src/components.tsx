import type { ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import type { ComplianceLevel } from "@marvicqui/shared-db";
import { cn } from "./utils";

export function ComplianceBadge({ level }: Readonly<{ level: ComplianceLevel }>) {
  const labels: Record<ComplianceLevel, string> = {
    compliant: "Vigente",
    expiring: "Por expirar",
    expired: "Expirado",
    invalid: "Invalido",
    missing: "Faltante"
  };

  const classes: Record<ComplianceLevel, string> = {
    compliant: "border-emerald-200 bg-emerald-50 text-emerald-700",
    expiring: "border-amber-200 bg-amber-50 text-amber-700",
    expired: "border-rose-200 bg-rose-50 text-rose-700",
    invalid: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    missing: "border-slate-200 bg-slate-50 text-slate-700"
  };

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", classes[level])}>
      {labels[level]}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function DocumentDropzone({
  label,
  accept,
  multiple = true
}: Readonly<{
  label: string;
  accept: string;
  multiple?: boolean;
}>) {
  return (
    <label className="grid cursor-pointer place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center hover:border-slate-400">
      <UploadCloud className="h-8 w-8 text-slate-500" />
      <span className="mt-3 text-sm font-semibold text-slate-950">{label}</span>
      <span className="mt-1 text-xs text-slate-500">Selecciona archivos o arrastralos aqui</span>
      <input className="sr-only" type="file" accept={accept} multiple={multiple} />
    </label>
  );
}

export function DataTable<T extends Record<string, string | number | ReactNode>>({
  columns,
  rows
}: Readonly<{
  columns: Array<{ key: keyof T; label: string }>;
  rows: T[];
}>) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-3 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-100">
              {columns.map((column) => (
                <td key={String(column.key)} className="px-4 py-3 text-slate-700">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
