import { Upload } from "lucide-react";
import { DataTable, DocumentDropzone } from "@marvicqui/shared-ui";
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
      <section className="mb-6">
        <DocumentDropzone label="Subir contrato PDF o DOCX" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
      </section>
      <DataTable
        columns={[
          { key: "title", label: "Contrato" },
          { key: "risk", label: "Hallazgo" },
          { key: "badge", label: "Riesgo" }
        ]}
        rows={contracts.map(([title, risk, tone]) => ({
          title,
          risk,
          badge: <StatusBadge tone={tone}>{tone === "danger" ? "Alto" : tone === "warning" ? "Medio" : "Bajo"}</StatusBadge>
        }))}
      />
    </>
  );
}
