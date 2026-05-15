export function AlertDocumentExpiredEmail({
  contractorName,
  documentType,
  appUrl
}: Readonly<{
  contractorName: string;
  documentType: string;
  appUrl: string;
}>) {
  return (
    <main>
      <h1>Documento expirado</h1>
      <p>
        {documentType} de {contractorName} ya expiro y requiere accion inmediata.
      </p>
      <a href={appUrl}>Actualizar documento</a>
    </main>
  );
}
