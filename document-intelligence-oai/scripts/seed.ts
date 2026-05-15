import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const workspaceNames = ["Demo Constructora SA", "Demo Maquiladora MX", "Demo Despacho Contable"];
const contractorNames = [
  "Servicios Norte SA",
  "Proveedores del Bajio",
  "Montajes Industriales MX",
  "Limpieza Industrial Roma",
  "Transporte Especializado Delta",
  "Seguridad Privada Anahuac",
  "Mantenimiento Integral Sur",
  "Logistica Fiscal Norte",
  "Consultoria REPSE Centro",
  "Obra Civil Alameda"
];

let supabase: ReturnType<typeof createClient> | null = null;

void main();

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log("Seed dry-run: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to load data.");
    console.log("Would create 3 workspaces, 10 contractors, 20 CFDIs, 5 contracts, and 10 templates.");
    return;
  }

  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: existingWorkspaces } = await getSupabase().from("workspaces").select("id").in("name", workspaceNames);
  const existingIds = existingWorkspaces?.map((workspace) => workspace.id) ?? [];

  if (existingIds.length > 0) {
    await getSupabase().from("workspaces").delete().in("id", existingIds);
  }

  const { data: workspaces, error: workspaceError } = await getSupabase()
    .from("workspaces")
    .insert(workspaceNames.map((name) => ({ name })))
    .select("id,name");

  if (workspaceError) {
    throw workspaceError;
  }

  const primaryWorkspace = workspaces?.[0];
  if (!primaryWorkspace) {
    throw new Error("No demo workspace was created");
  }

  await seedContractors(primaryWorkspace.id);
  await seedCfdis(primaryWorkspace.id);
  await seedContracts(primaryWorkspace.id);
  await seedTemplates(primaryWorkspace.id);

  console.log(`Seed complete for ${workspaceNames.length} workspaces.`);
}

async function seedContractors(workspaceId: string) {
  const db = getSupabase();
  const contractors = contractorNames.map((name, index) => ({
    workspace_id: workspaceId,
    rfc: `DEM${String(index + 1).padStart(6, "0")}AA${index % 10}`,
    legal_name: name,
    contact_name: `Contacto ${index + 1}`,
    contact_email: `contratista${index + 1}@example.com`,
    contact_phone: "+525500000000",
    status: ["compliant", "expiring", "expired", "missing", "invalid"][index % 5]
  }));

  const { data, error } = await db.from("laboral_contractors").insert(contractors).select("id,status");
  if (error) {
    throw error;
  }

  const statuses = (data ?? []).flatMap((contractor, index) => {
    const levels = ["compliant", "expiring", "expired", "missing", "invalid"] as const;
    return ["repse", "sat_32d", "imss_32d", "infonavit", "csf"].map((documentType, documentIndex) => ({
      workspace_id: workspaceId,
      contractor_id: contractor.id,
      document_type: documentType,
      level: levels[(index + documentIndex) % levels.length],
      expires_at: documentIndex === 0 ? "2026-05-17" : "2026-12-31"
    }));
  });

  const { error: statusError } = await db.from("laboral_compliance_status").insert(statuses);
  if (statusError) {
    throw statusError;
  }
}

async function seedCfdis(workspaceId: string) {
  const db = getSupabase();
  const cfdis = Array.from({ length: 20 }, (_, index) => ({
    workspace_id: workspaceId,
    sat_uuid: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    issuer_rfc: "MARI9001015W4",
    issuer_name: "Marvicqui Servicios SA de CV",
    receiver_rfc: "COSC8001137NA",
    receiver_name: "Constructora Sierra Centro SA",
    total: 1000 + index * 250,
    issued_at: `2026-04-${String((index % 25) + 1).padStart(2, "0")}T12:00:00Z`,
    comprobante_type: index % 2 === 0 ? "I" : "E"
  }));

  const { error } = await db.from("cfdi_xmls").insert(cfdis);
  if (error) {
    throw error;
  }
}

async function seedContracts(workspaceId: string) {
  const db = getSupabase();
  const contracts = [
    ["Contrato de servicios profesionales", "Servicios profesionales", "medium"],
    ["NDA bilateral", "NDA", "low"],
    ["Contrato de subcontratacion especializada", "Subcontratacion especializada", "critical"],
    ["Contrato de mantenimiento industrial", "Servicios profesionales", "medium"],
    ["Convenio marco de proveedores", "General", "high"]
  ].map(([title, contractType, severity]) => ({
    workspace_id: workspaceId,
    title,
    contract_type: contractType,
    jurisdiction: "Mexico",
    amount: 250000,
    overall_severity: severity,
    parties: [{ name: "Demo Constructora SA" }, { name: "Proveedor Demo" }]
  }));

  const { error } = await db.from("contracts").insert(contracts);
  if (error) {
    throw error;
  }
}

async function seedTemplates(workspaceId: string) {
  const db = getSupabase();
  const templates = Array.from({ length: 10 }, (_, index) => ({
    workspace_id: workspaceId,
    clause_type: ["indemnizacion", "terminacion", "confidencialidad", "repse", "propiedad_intelectual"][index % 5],
    title: `Template de clausula ${index + 1}`,
    reference_text: "Texto de referencia para comparar clausulas y detectar desviaciones relevantes.",
    severity_if_missing: index % 3 === 0 ? "high" : "medium"
  }));

  const { error } = await db.from("contract_templates").insert(templates);
  if (error) {
    throw error;
  }
}

function getSupabase(): ReturnType<typeof createClient> {
  if (!supabase) {
    throw new Error("Supabase client is not initialized");
  }

  return supabase;
}
