import { FileUp } from "lucide-react";
import { Button, PageHeader, StatusBadge } from "@/components/ui-primitives";

const rows = [
  ["BBVA abril 2026", "20 CFDI", "18 matches", "good"],
  ["Santander marzo 2026", "14 CFDI", "3 pendientes", "warning"]
] as const;

export default function CfdiPage() {
  return (
    <>
      <PageHeader
        eyebrow="Modulo 1"
        title="Conciliacion CFDI"
        description="Carga XMLs y estados de cuenta para ejecutar match exacto, difuso y revision asistida por Claude."
        action={<Button><FileUp className="mr-2 h-4 w-4" />Nueva conciliacion</Button>}
      />
      <div className="rounded-lg border border-slate-200 bg-white">
        {rows.map(([name, cfdis, matches, tone]) => (
          <div key={name} className="grid grid-cols-4 items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
            <span className="text-sm font-semibold">{name}</span>
            <span className="text-sm text-slate-600">{cfdis}</span>
            <span className="text-sm text-slate-600">{matches}</span>
            <StatusBadge tone={tone}>{tone === "good" ? "Conciliado" : "Revision"}</StatusBadge>
          </div>
        ))}
      </div>
    </>
  );
}
