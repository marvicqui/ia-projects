import Link from "next/link";
import { signInWithGoogle, signInWithMagicLink, signInWithMicrosoft } from "./actions";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-950">Iniciar sesion</h1>
        <p className="mt-2 text-sm text-slate-600">Entra con OAuth o recibe un magic link en tu correo.</p>
        <form action={signInWithGoogle} className="mt-6">
          <button className="h-10 w-full rounded-lg border border-slate-200 text-sm font-semibold">Continuar con Google</button>
        </form>
        <form action={signInWithMicrosoft} className="mt-3">
          <button className="h-10 w-full rounded-lg border border-slate-200 text-sm font-semibold">Continuar con Microsoft</button>
        </form>
        <form action={signInWithMagicLink} className="mt-3 grid gap-3">
          <input name="email" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="correo@empresa.com" />
          <button className="h-10 rounded-lg bg-slate-950 text-sm font-semibold text-white">Enviar magic link</button>
        </form>
        <p className="mt-5 text-sm text-slate-600">
          No tienes cuenta? <Link className="font-semibold text-slate-950" href="/signup">Crear cuenta</Link>
        </p>
      </section>
    </main>
  );
}
