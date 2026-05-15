import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-950">Crear cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">Al registrarte se crea tu workspace automaticamente.</p>
        <div className="mt-6 grid gap-3">
          <button className="h-10 rounded-lg border border-slate-200 text-sm font-semibold">Registrarme con Google</button>
          <button className="h-10 rounded-lg border border-slate-200 text-sm font-semibold">Registrarme con Microsoft</button>
          <input className="h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="correo@empresa.com" />
          <button className="h-10 rounded-lg bg-slate-950 text-sm font-semibold text-white">Enviar magic link</button>
        </div>
        <p className="mt-5 text-sm text-slate-600">
          Ya tienes cuenta? <Link className="font-semibold text-slate-950" href="/login">Iniciar sesion</Link>
        </p>
      </section>
    </main>
  );
}
