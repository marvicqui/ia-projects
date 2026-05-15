import { requireAppSession, buildCookieAdapter } from '@/lib/session';
import { Shell } from '@/components/shell';
import { createSupabaseServerClient } from '@jvp/shared-db';
import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/dates';
import Link from 'next/link';
import { ContractorDocuments, type DocStatusByType, type ExtractionRow } from './contractor-documents';
import { ExtractionsHistory } from './extractions-history';

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
        <ExtractionsHistory extractions={extractionRows} />
      </section>
    </Shell>
  );
}
