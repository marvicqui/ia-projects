import { FileUp } from "lucide-react";
import { DataTable, DocumentDropzone } from "@marvicqui/shared-ui";
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
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <DocumentDropzone label="Subir XML CFDI" accept=".xml,application/xml,text/xml" />
        <DocumentDropzone label="Subir estado de cuenta" accept=".csv,application/pdf,text/csv" />
      </section>
      <DataTable
        columns={[
          { key: "name", label: "Conciliacion" },
          { key: "cfdis", label: "CFDI" },
          { key: "matches", label: "Matches" },
          { key: "status", label: "Estado" }
        ]}
        rows={rows.map(([name, cfdis, matches, tone]) => ({
          name,
          cfdis,
          matches,
          status: <StatusBadge tone={tone}>{tone === "good" ? "Conciliado" : "Revision"}</StatusBadge>
        }))}
      />
    </>
  );
}
