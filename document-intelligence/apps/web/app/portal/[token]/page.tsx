interface PortalPageProps { params: Promise<{ token: string }> }

export default async function ContractorPortalPage({ params }: PortalPageProps) {
  const { token } = await params;
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Portal de Contratista</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Token: <code className="break-all">{token}</code>
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-6 text-sm dark:bg-amber-950 dark:text-amber-200">
        Portal pendiente de implementar en la próxima sesión.
      </div>
    </main>
  );
}
