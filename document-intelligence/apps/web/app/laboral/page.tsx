import { requireAppSession } from '@/lib/session';
import { Shell } from '@/components/shell';

export default async function LaboralPage() {
  const session = await requireAppSession();
  return (
    <Shell active="/laboral" email={session.email} isPlatformAdmin={session.isPlatformAdmin} workspaceName={session.workspaceName}>
      <h1 className="text-3xl font-semibold tracking-tight">Cumplimiento Laboral</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        REPSE, IMSS, INFONAVIT, SAT 32-D y CSF. Portal para contratistas y alertas automáticas.
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-6 text-sm dark:bg-amber-950 dark:text-amber-200">
        <strong className="block">Módulo en construcción</strong>
        Schema, tablas y RLS ya están desplegados. Pendiente: extractores con Claude Haiku visión sobre PDF,
        portal público vía token, semáforo de 5 columnas y alertas vía pg_cron + Resend/Twilio.
        <br />
        Ver <code>packages/modules/laboral/README.md</code> para el plan detallado de la próxima sesión.
      </div>
    </Shell>
  );
}
