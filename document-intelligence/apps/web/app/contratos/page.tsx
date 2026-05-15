import { requireAppSession } from '@/lib/session';
import { Shell } from '@/components/shell';

export default async function ContratosPage() {
  const session = await requireAppSession();
  return (
    <Shell active="/contratos" email={session.email} isPlatformAdmin={session.isPlatformAdmin} workspaceName={session.workspaceName}>
      <h1 className="text-3xl font-semibold tracking-tight">Análisis de Contratos</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Due diligence asistida por IA: extracción de cláusulas, scoring de riesgo y comparación con plantillas.
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-6 text-sm dark:bg-amber-950 dark:text-amber-200">
        <strong className="block">Módulo en construcción</strong>
        Schema con pgvector, embeddings y plantillas ya está desplegado.
        Pendiente: pipeline multi-agente con Mastra (Extractor → Clausulador → Risk Analyzer → Reporter),
        viewer de PDF con cláusulas resaltadas y RAG sobre histórico.
        <br />
        Ver <code>packages/modules/contratos/README.md</code> para el plan detallado de la próxima sesión.
      </div>
    </Shell>
  );
}
