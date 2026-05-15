import { MetricCard, PageHeader, StatusBadge } from "@/components/ui-primitives";

const alerts = [
  ["REPSE Proveedores del Bajio", "Expira en 3 dias", "warning"],
  ["Contrato de subcontratacion", "Riesgo alto", "danger"],
  ["CFDI ingresos abril", "18 de 20 conciliados", "good"]
] as const;

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Vista global"
        title="Dashboard"
        description="Metricas operativas de CFDI, cumplimiento laboral y contratos para el workspace activo."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="CFDI conciliados" value="18/20" detail="90% conciliado en la corrida demo" />
        <MetricCard label="Contratistas compliant" value="7/10" detail="2 por expirar y 1 invalido" />
        <MetricCard label="Contratos analizados" value="5" detail="2 con riesgo alto o critico" />
      </section>
      <section className="mt-6 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold">Alertas recientes</h2>
        </div>
        {alerts.map(([name, detail, tone]) => (
          <div key={name} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0">
            <span className="text-sm font-medium">{name}</span>
            <StatusBadge tone={tone}>{detail}</StatusBadge>
          </div>
        ))}
      </section>
    </>
  );
}
