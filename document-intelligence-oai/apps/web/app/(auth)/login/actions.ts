"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  await signInWithOAuth("google");
}

export async function signInWithMicrosoft() {
  await signInWithOAuth("azure");
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createSupabaseServerClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`;

  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });

  redirect("/login?sent=1");
}

async function signInWithOAuth(provider: "google" | "azure") {
  const supabase = await createSupabaseServerClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo }
  });

  if (error) {
    throw error;
  }

  if (data.url) {
    redirect(data.url);
  }
}
