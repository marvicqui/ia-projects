export function ContractorPortalInvitationEmail({
  workspaceName,
  portalUrl
}: Readonly<{
  workspaceName: string;
  portalUrl: string;
}>) {
  return (
    <main>
      <h1>Solicitud de documentos</h1>
      <p>{workspaceName} solicita tus documentos de cumplimiento laboral.</p>
      <a href={portalUrl}>Abrir portal</a>
    </main>
  );
}
