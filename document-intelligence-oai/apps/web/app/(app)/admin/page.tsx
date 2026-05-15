import { PageHeader, StatusBadge } from "@/components/ui-primitives";

const workspaces = ["Demo Constructora SA", "Demo Maquiladora MX", "Demo Despacho Contable"];

export default function AdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="Platform admin"
        title="Admin"
        description="Vista global de workspaces, costos de Claude, documentos procesados e impersonation controlada."
      />
      <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
        Modo admin - visible solo para el correo platform admin configurado.
      </div>
      <div className="rounded-lg border border-slate-200 bg-white">
        {workspaces.map((workspace) => (
          <div key={workspace} className="grid grid-cols-4 items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
            <span className="text-sm font-semibold">{workspace}</span>
            <span className="text-sm text-slate-600">3 usuarios</span>
            <span className="text-sm text-slate-600">42 docs</span>
            <StatusBadge>Ver como</StatusBadge>
          </div>
        ))}
      </div>
    </>
  );
}
