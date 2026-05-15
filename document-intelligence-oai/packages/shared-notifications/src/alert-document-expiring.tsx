export function AlertDocumentExpiringEmail({
  contractorName,
  documentType,
  expiresAt,
  appUrl
}: Readonly<{
  contractorName: string;
  documentType: string;
  expiresAt: string;
  appUrl: string;
}>) {
  return (
    <main>
      <h1>Documento por expirar</h1>
      <p>
        {documentType} de {contractorName} expira el {expiresAt}.
      </p>
      <a href={appUrl}>Revisar cumplimiento</a>
    </main>
  );
}
