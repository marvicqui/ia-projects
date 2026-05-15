import Link from "next/link";
import { ArrowRight, CheckCircle2, FileCheck2, FileSpreadsheet, Gavel } from "lucide-react";

const modules = [
  {
    title: "CFDI y bancos",
    copy: "Conciliacion deterministica con revision asistida por IA cuando el caso no es obvio.",
    icon: FileSpreadsheet
  },
  {
    title: "Laboral",
    copy: "REPSE, IMSS, INFONAVIT, SAT y CSF en un tablero de cumplimiento por contratista.",
    icon: FileCheck2
  },
  {
    title: "Contratos",
    copy: "Extraccion de clausulas, riesgos y resumen ejecutivo con pipeline multi-agente.",
    icon: Gavel
  }
];

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative min-h-[88vh] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f172a_0%,#12363f_55%,#7c2d12_100%)]" />
        <div className="absolute inset-0 opacity-90">
          <div className="mx-auto mt-28 grid max-w-6xl grid-cols-1 gap-4 px-6 lg:grid-cols-[1fr_1.35fr]">
            <div className="pt-10">
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Regulatorio MX</p>
              <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight tracking-normal sm:text-6xl">
                JVP Document Intelligence
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-200">
                Un workspace multi-tenant para analizar CFDI, cumplimiento laboral y contratos con trazabilidad,
                RLS y datos listos para auditoria.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-slate-100"
                >
                  Empezar gratis <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-lg border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Iniciar sesion
                </Link>
              </div>
            </div>
            <div className="hidden rounded-lg border border-white/20 bg-white/95 p-4 text-slate-950 shadow-2xl lg:block">
              <div className="grid grid-cols-3 gap-3">
                {["CFDI conciliados", "Contratistas OK", "Riesgos criticos"].map((label, index) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{["18", "7", "2"][index]}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-slate-200">
                {["Factura A9C7 matcheada con SPEI", "REPSE expira en 3 dias", "No compete agresiva detectada"].map(
                  (item, index) => (
                    <div key={item} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
                      <CheckCircle2 className={`h-5 w-5 ${index === 1 ? "text-amber-500" : "text-emerald-500"}`} />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-white px-6 py-14 text-slate-950">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <article key={module.title} className="rounded-lg border border-slate-200 p-5">
                <Icon className="h-6 w-6 text-slate-700" />
                <h2 className="mt-4 text-lg font-semibold">{module.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{module.copy}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
