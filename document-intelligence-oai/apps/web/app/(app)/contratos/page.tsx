import { Upload } from "lucide-react";
import { Button, PageHeader, StatusBadge } from "@/components/ui-primitives";

const contracts = [
  ["Servicios profesionales", "No compete agresiva", "warning"],
  ["NDA bilateral", "Bajo riesgo", "good"],
  ["Subcontratacion especializada", "Falta REPSE", "danger"]
] as const;

export default function ContratosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Modulo 3"
        title="Analisis de contratos"
        description="Pipeline Mastra para extraccion, clasificacion de clausulas, riesgos y resumen ejecutivo."
        action={<Button><Upload className="mr-2 h-4 w-4" />Subir contrato</Button>}
      />
      <div className="rounded-lg border border-slate-200 bg-white">
        {contracts.map(([title, risk, tone]) => (
          <div key={title} className="grid grid-cols-3 items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-sm text-slate-600">{risk}</span>
            <StatusBadge tone={tone}>{tone === "danger" ? "Alto" : tone === "warning" ? "Medio" : "Bajo"}</StatusBadge>
          </div>
        ))}
      </div>
    </>
  );
}
