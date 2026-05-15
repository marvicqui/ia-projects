export function documentExpiringWhatsApp(contractorName: string, documentType: string, appUrl: string): string {
  return `Document Intelligence: ${documentType} de ${contractorName} expira pronto. Revisa y actualiza aqui: ${appUrl}`;
}

export function contractorPortalInvitationWhatsApp(workspaceName: string, portalUrl: string): string {
  return `${workspaceName}: sube tus documentos de cumplimiento en este portal seguro: ${portalUrl}`;
}
