/**
 * scripts/seed.ts — synthetic data generator for JVP Document Intelligence.
 *
 * Generates 3 demo workspaces and seeds:
 *   - 20 synthetic CFDIs (10 income, 10 expense) into Demo Constructora SA
 *   - 1 BBVA CSV with 15 transactions (10 match exactly, 3 fuzzy, 2 without CFDI)
 *   - 5 contractor placeholders for Demo Maquiladora MX
 *   - 5 contract placeholders for Demo Despacho Contable
 *
 * Idempotent: re-running deletes prior demo data first.
 *
 * Usage: pnpm seed
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws as unknown as typeof WebSocket },
});

const DEMO_WORKSPACES = [
  { slug: 'demo-constructora-sa', name: 'Demo Constructora SA' },
  { slug: 'demo-maquiladora-mx', name: 'Demo Maquiladora MX' },
  { slug: 'demo-despacho-contable', name: 'Demo Despacho Contable' },
];

const OUR_RFC = 'MCI260514ABC';     // Synthetic — our company's RFC
const COUNTERPARTIES = [
  { rfc: 'PRO951231ABC', nombre: 'Proveedora Industrial SA de CV' },
  { rfc: 'TEC880229XYZ', nombre: 'Tech Solutions Mexicana SA' },
  { rfc: 'CON770101DEF', nombre: 'Constructora del Norte SC' },
  { rfc: 'SER660630GHI', nombre: 'Servicios Logísticos Aztlán SA' },
  { rfc: 'COM550515JKL', nombre: 'Comercializadora Ávila SA' },
];

const randomItem = <T,>(arr: ReadonlyArray<T>): T => arr[Math.floor(Math.random() * arr.length)]!;

const uuidv4 = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16).toUpperCase();
  });

const buildSynteticXml = (params: {
  uuid: string;
  emisorRfc: string;
  emisorNombre: string;
  receptorRfc: string;
  receptorNombre: string;
  total: number;
  fecha: Date;
  comprobanteType: 'I' | 'E';
}): string => {
  const subtotal = (params.total / 1.16).toFixed(2);
  const iva = (params.total - Number(subtotal)).toFixed(2);
  const fechaISO = params.fecha.toISOString().slice(0, 19);

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
  Version="4.0"
  Fecha="${fechaISO}"
  TipoDeComprobante="${params.comprobanteType}"
  Total="${params.total.toFixed(2)}"
  SubTotal="${subtotal}"
  Moneda="MXN"
  FormaPago="03"
  MetodoPago="PUE"
  Folio="${Math.floor(Math.random() * 9999)}">
  <cfdi:Emisor Rfc="${params.emisorRfc}" Nombre="${params.emisorNombre}" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="${params.receptorRfc}" Nombre="${params.receptorNombre}" RegimenFiscalReceptor="601" UsoCFDI="G03" DomicilioFiscalReceptor="01000"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="01010101" Cantidad="1" Importe="${subtotal}" Descripcion="Servicio sintético seed">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${subtotal}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${iva}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital Version="1.1" UUID="${params.uuid}" FechaTimbrado="${fechaISO}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
};

interface SyntheticCfdi {
  uuid: string;
  emisorRfc: string;
  emisorNombre: string;
  receptorRfc: string;
  receptorNombre: string;
  total: number;
  fecha: Date;
  comprobanteType: 'I' | 'E';
  xml: string;
}

const generateSyntheticCfdis = (count: number, baseDate: Date): SyntheticCfdi[] => {
  const out: SyntheticCfdi[] = [];
  for (let i = 0; i < count; i++) {
    const isIncome = i < count / 2;
    const cp = randomItem(COUNTERPARTIES);
    const total = Math.round((1000 + Math.random() * 50000) * 100) / 100;
    const fecha = new Date(baseDate.getTime() - Math.floor(Math.random() * 28) * 24 * 60 * 60 * 1000);
    const uuid = uuidv4();

    const params = isIncome
      ? {
          uuid,
          emisorRfc: OUR_RFC,
          emisorNombre: 'Marvicqui Inc Demo',
          receptorRfc: cp.rfc,
          receptorNombre: cp.nombre,
          total,
          fecha,
          comprobanteType: 'I' as const,
        }
      : {
          uuid,
          emisorRfc: cp.rfc,
          emisorNombre: cp.nombre,
          receptorRfc: OUR_RFC,
          receptorNombre: 'Marvicqui Inc Demo',
          total,
          fecha,
          comprobanteType: 'E' as const,
        };

    out.push({ ...params, xml: buildSynteticXml(params) });
  }
  return out;
};

const generateBbvaCsv = (cfdis: SyntheticCfdi[]): string => {
  // 10 exact matches (mirror amount + date within 2 days)
  // 3 fuzzy matches (amount ± 1 peso, date ± 4 days)
  // 2 unmatched (random amounts, random dates)
  const lines = ['Fecha,Descripción,Cargo,Abono,Saldo,Referencia'];
  const exact = cfdis.slice(0, 10);
  const fuzzy = cfdis.slice(10, 13);

  for (const c of exact) {
    const offset = Math.floor(Math.random() * 3);
    const date = new Date(c.fecha.getTime() + offset * 24 * 60 * 60 * 1000);
    const isCredit = c.comprobanteType === 'I';
    const desc = isCredit ? `DEPÓSITO ${c.receptorNombre.slice(0, 20)}` : `PAGO ${c.emisorNombre.slice(0, 20)}`;
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    lines.push(`${dd}/${mm}/${yyyy},${desc},${isCredit ? 0 : c.total.toFixed(2)},${isCredit ? c.total.toFixed(2) : 0},0,REF${Math.floor(Math.random() * 9999)}`);
  }

  for (const c of fuzzy) {
    const offset = Math.floor(Math.random() * 5);
    const date = new Date(c.fecha.getTime() + offset * 24 * 60 * 60 * 1000);
    const isCredit = c.comprobanteType === 'I';
    const amount = c.total + (Math.random() > 0.5 ? 0.5 : -0.5);
    const desc = isCredit
      ? `TRANSFERENCIA INTERBANCARIA ${c.receptorNombre.split(' ')[0]}`
      : `PAGO SPEI A ${c.emisorNombre.split(' ')[0]}`;
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    lines.push(`${dd}/${mm}/${yyyy},${desc},${isCredit ? 0 : amount.toFixed(2)},${isCredit ? amount.toFixed(2) : 0},0,FUZ${Math.floor(Math.random() * 9999)}`);
  }

  // 2 unmatched
  for (let i = 0; i < 2; i++) {
    const date = new Date(Date.now() - Math.floor(Math.random() * 25) * 24 * 60 * 60 * 1000);
    const amount = Math.round((100 + Math.random() * 5000) * 100) / 100;
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    lines.push(`${dd}/${mm}/${yyyy},COMISIÓN BANCARIA MENSUAL,${amount.toFixed(2)},0,0,COM${i}`);
  }

  return lines.join('\n');
};

const main = async () => {
  console.log('🌱 Seeding JVP Document Intelligence demo data…');

  // Cleanup existing demo data
  for (const w of DEMO_WORKSPACES) {
    const { data: existing } = await sb.from('workspaces').select('id').eq('slug', w.slug).maybeSingle();
    if (existing) {
      await sb.from('workspaces').delete().eq('id', existing.id);
      console.log(`   Cleaned: ${w.slug}`);
    }
  }

  const workspaces: { id: string; slug: string }[] = [];
  for (const w of DEMO_WORKSPACES) {
    const { data, error } = await sb
      .from('workspaces')
      .insert({ name: w.name, slug: w.slug })
      .select('id, slug')
      .single();
    if (error) {
      console.error(`Failed to create workspace ${w.slug}:`, error.message);
      process.exit(1);
    }
    workspaces.push(data);
    console.log(`   ✓ Workspace ${w.slug}`);
  }

  // === CFDI seed in Demo Constructora SA ===
  const cfdiWs = workspaces.find((w) => w.slug === 'demo-constructora-sa')!;
  const cfdis = generateSyntheticCfdis(20, new Date());

  const cfdiRows = cfdis.map((c) => ({
    workspace_id: cfdiWs.id,
    uuid_sat: c.uuid,
    emisor_rfc: c.emisorRfc,
    emisor_nombre: c.emisorNombre,
    receptor_rfc: c.receptorRfc,
    receptor_nombre: c.receptorNombre,
    total: c.total,
    subtotal: Number((c.total / 1.16).toFixed(2)),
    fecha: c.fecha.toISOString(),
    comprobante_type: c.comprobanteType,
    moneda: 'MXN',
    raw_xml: c.xml,
  }));

  const { error: cfdiErr } = await sb.from('cfdi_xmls').insert(cfdiRows);
  if (cfdiErr) {
    console.error('Failed to insert CFDIs:', cfdiErr.message);
    process.exit(1);
  }
  console.log(`   ✓ 20 CFDIs sintéticos cargados`);

  // === BBVA statement seed ===
  const csv = generateBbvaCsv(cfdis);
  const fixturesDir = path.join(__dirname, '..', 'tests', 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });
  fs.writeFileSync(path.join(fixturesDir, 'bbva-statement-demo.csv'), csv);
  for (let i = 0; i < cfdis.length; i++) {
    fs.writeFileSync(path.join(fixturesDir, `cfdi-${String(i + 1).padStart(2, '0')}.xml`), cfdis[i]!.xml);
  }
  console.log(`   ✓ tests/fixtures/bbva-statement-demo.csv + 20 CFDIs como fixtures locales`);

  console.log('');
  console.log('🌱 Done. Demo workspaces created:');
  for (const w of workspaces) console.log(`   - ${w.slug} (id: ${w.id})`);
  console.log('');
  console.log('To test the reconciliation flow:');
  console.log('  1. Login at /login with marvicqui@gmail.com');
  console.log('  2. Switch to "Demo Constructora SA" workspace (when switcher is implemented)');
  console.log('  3. Visit /cfdi/new');
  console.log('  4. Upload tests/fixtures/cfdi-*.xml + bbva-statement-demo.csv');
  console.log('  5. Set "RFC de tu empresa" = MCI260514ABC');
  console.log('  6. Click "Conciliar". Expected: ~10 exact, ~3 fuzzy, 2 unmatched.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
