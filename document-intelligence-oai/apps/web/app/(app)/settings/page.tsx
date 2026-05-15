import { PageHeader } from "@/components/ui-primitives";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cuenta"
        title="Settings"
        description="Perfil, miembros, API keys, integraciones, OAuth y billing placeholder para el workspace."
      />
      <section className="grid gap-4 md:grid-cols-2">
        {["Perfil", "Workspace", "API keys", "Integraciones"].map((item) => (
          <article key={item} className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">{item}</h2>
            <p className="mt-2 text-sm text-slate-600">Configuracion editable en la siguiente iteracion funcional.</p>
          </article>
        ))}
      </section>
    </>
  );
}
