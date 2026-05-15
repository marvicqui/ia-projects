import { PageHeader } from "@/components/ui-primitives";

export default function ContractorPortalPage({ params }: Readonly<{ params: { token: string } }>) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <PageHeader
        eyebrow="Portal del contratista"
        title="Carga de documentos"
        description={`Token activo: ${params.token}. Sube REPSE, SAT 32-D, IMSS, INFONAVIT y CSF sin crear cuenta.`}
      />
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        Arrastra documentos PDF aqui o selecciona archivos.
      </div>
    </main>
  );
}
