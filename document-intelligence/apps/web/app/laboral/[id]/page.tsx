import { requireAppSession, buildCookieAdapter } from '@/lib/session';
import { Shell } from '@/components/shell';
import { createSupabaseServerClient } from '@jvp/shared-db';
import { notFound } from 'next/navigation';
import { formatDate, formatDateTime } from '@/lib/dates';
import Link from 'next/link';
import { ContractorDocuments, type DocStatusByType, type ExtractionRow } from './contractor-documents';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireAppSession();
  const { adapter } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);

  const { data: contractor } = await supabase
    .from('laboral_contractors')
    .select('id, rfc, razon_social, contact_email, contact_phone, is_active, created_at, portal_token')
    .eq('id', id)
    .eq('workspace_id', session.workspaceId)
    .single();
  if (!contractor) notFound();

  const { data: statuses } = await supabase
    .from('laboral_compliance_status')
    .select('doc_type, level, days_until_expiry, updated_at')
    .eq('contractor_id', id);

  const statusByType: DocStatusByType = {};
  for (const s of statuses ?? []) {
    statusByType[s.doc_type] = {
      level: s.level,
      days_until_expiry: s.days_until_expiry,
      updated_at: s.updated_at,
    };
  }

  const { data: extractions } = await supabase
    .from('laboral_extractions')
    .select('id, doc_type, extracted_data, emitted_at, expires_at, valid, confidence, created_at, document_id')
    .eq('contractor_id', id)
    .order('created_at', { ascending: false });

  const extractionRows: ExtractionRow[] = (extractions ?? []).map((e) => ({
    id: e.id,
    doc_type: e.doc_type,
    extracted_data: e.extracted_data,
    emitted_at: e.emitted_at,
    expires_at: e.expires_at,
    valid: e.valid,
    confidence: Number(e.confidence ?? 0),
    created_at: e.created_at,
  }));

  return (
    <Shell active="/laboral" email={session.email} isPlatformAdmin={session.isPlatformAdmin} workspaceName={session.workspaceName}>
      <header>
        <Link href="/laboral" className="text-xs text-zinc-500 hover:underline">
          ← Volver a contratistas
        </Link>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{contractor.razon_social}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          RFC: <span className="font-mono">{contractor.rfc}</span>
          {contractor.contact_email && <> · {contractor.contact_email}</>}
          {contractor.contact_phone && <> · {contractor.contact_phone}</>}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Registrado el {formatDate(contractor.created_at)}
        </p>
      </header>

      <ContractorDocuments
        contractorId={id}
        statusByType={statusByType}
        extractions={extractionRows}
      />

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Historial de extracciones</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha subida</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-center font-medium">Válido</th>
                <th className="px-3 py-2 text-center font-medium">Vence</th>
                <th className="px-3 py-2 text-right font-medium">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {extractionRows.map((e) => (
                <tr key={e.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 text-xs">{formatDateTime(e.created_at)}</td>
                  <td className="px-3 py-2 font-mono text-xs uppercase">{e.doc_type}</td>
                  <td className="px-3 py-2 text-center">
                    {e.valid ? '✓' : <span className="text-red-600">✗</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-zinc-500">
                    {e.expires_at ? formatDate(e.expires_at) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums">
                    {(e.confidence * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
              {!extractionRows.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-zinc-500">
                    Aún no hay documentos subidos para este contratista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
