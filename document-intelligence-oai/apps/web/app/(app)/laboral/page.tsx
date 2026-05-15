import { UserPlus } from "lucide-react";
import { Button, PageHeader, StatusBadge } from "@/components/ui-primitives";

const contractors = [
  ["Servicios Norte SA", "REPSE vigente", "good"],
  ["Proveedores del Bajio", "REPSE expira", "warning"],
  ["Montajes Industriales MX", "IMSS expirado", "danger"]
] as const;

export default function LaboralPage() {
  return (
    <>
      <PageHeader
        eyebrow="Modulo 2"
        title="Cumplimiento laboral"
        description="Control REPSE, SAT 32-D, IMSS, INFONAVIT y CSF por contratista con portal publico."
        action={<Button><UserPlus className="mr-2 h-4 w-4" />Nuevo contratista</Button>}
      />
      <div className="rounded-lg border border-slate-200 bg-white">
        {contractors.map(([name, status, tone]) => (
          <div key={name} className="grid grid-cols-3 items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
            <span className="text-sm font-semibold">{name}</span>
            <span className="text-sm text-slate-600">Documentos laborales</span>
            <StatusBadge tone={tone}>{status}</StatusBadge>
          </div>
        ))}
      </div>
    </>
  );
}
