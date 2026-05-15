export default function OnboardingPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Configurando tu workspace…</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Si esta pantalla persiste, revisa que el trigger <code>handle_new_user</code> esté instalado.
      </p>
    </main>
  );
}
