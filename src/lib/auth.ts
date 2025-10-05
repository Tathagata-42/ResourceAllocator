
import { supabase } from "./supabaseClient";

export async function signInPM() {
  const email = import.meta.env.VITE_PM_EMAIL as string;
  const password = import.meta.env.VITE_PM_PASSWORD as string;
  if (!email || !password) {
    throw new Error("Missing VITE_PM_EMAIL or VITE_PM_PASSWORD");
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}