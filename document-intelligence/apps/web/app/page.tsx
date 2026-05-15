import Link from 'next/link';

const MODULES = [
  {
    name: 'Conciliación CFDI',
    desc: 'Empareja CFDIs SAT con tu estado de cuenta en tres pasadas. Encuentra ingresos y egresos no facturados.',
    href: '/cfdi',
  },
  {
    name: 'Cumplimiento Laboral',
    desc: 'REPSE, IMSS, INFONAVIT y SAT 32-D al día. Portal para contratistas y alertas automáticas.',
    href: '/laboral',
  },
  {
    name: 'Análisis de Contratos',
    desc: 'Due diligence asistida por IA: extracción de cláusulas, scoring de riesgo y comparación con plantillas.',
    href: '/contratos',
  },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">JVP Document Intelligence</h1>
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Iniciar sesión
        </Link>
      </header>

      <section className="mt-16">
        <h2 className="text-5xl font-semibold tracking-tight">
          Compliance documental sin hojas de cálculo.
        </h2>
        <p className="mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
          Concilia CFDIs, mantén tus contratistas al día con REPSE/IMSS/INFONAVIT y analiza contratos con IA.
          Tres módulos, una plataforma, hecha en México para México.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Empezar gratis
          </Link>
          <a
            href="#modulos"
            className="rounded-md border border-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Ver módulos
          </a>
        </div>
      </section>

      <section id="modulos" className="mt-24 grid gap-6 md:grid-cols-3">
        {MODULES.map((m) => (
          <Link
            key={m.name}
            href={m.href}
            className="block rounded-lg border border-zinc-200 p-6 transition hover:border-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-100"
          >
            <h3 className="text-lg font-semibold">{m.name}</h3>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{m.desc}</p>
          </Link>
        ))}
      </section>

      <footer className="mt-32 border-t border-zinc-200 pt-8 text-sm text-zinc-500 dark:border-zinc-800">
        © 2026 Marvicqui Inc. Todos los derechos reservados.
      </footer>
    </main>
  );
}
