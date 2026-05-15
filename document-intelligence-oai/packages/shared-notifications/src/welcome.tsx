export function WelcomeEmail({ appUrl }: Readonly<{ appUrl: string }>) {
  return (
    <main>
      <h1>Bienvenido a JVP Document Intelligence</h1>
      <p>Tu workspace ya esta listo para cargar documentos.</p>
      <a href={appUrl}>Entrar</a>
    </main>
  );
}
