import { UserPlus } from "lucide-react";
import { ComplianceBadge, DataTable, DocumentDropzone } from "@marvicqui/shared-ui";
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
      <section className="mb-6">
        <DocumentDropzone label="Subir REPSE, SAT 32-D, IMSS, INFONAVIT o CSF" accept=".pdf,application/pdf" />
      </section>
      <DataTable
        columns={[
          { key: "name", label: "Contratista" },
          { key: "documents", label: "Documentos" },
          { key: "badge", label: "Semaforo" },
          { key: "legacy", label: "Detalle" }
        ]}
        rows={contractors.map(([name, status, tone]) => ({
          name,
          documents: "REPSE / SAT / IMSS / INFONAVIT / CSF",
          badge: <ComplianceBadge level={tone === "good" ? "compliant" : tone === "warning" ? "expiring" : "expired"} />,
          legacy: <StatusBadge tone={tone}>{status}</StatusBadge>
        }))}
      />
    </>
  );
}
