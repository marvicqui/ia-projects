export function WeeklySummaryEmail({
  workspaceName,
  appUrl
}: Readonly<{
  workspaceName: string;
  appUrl: string;
}>) {
  return (
    <main>
      <h1>Resumen semanal</h1>
      <p>Estas son las alertas y documentos procesados de {workspaceName}.</p>
      <a href={appUrl}>Abrir dashboard</a>
    </main>
  );
}
