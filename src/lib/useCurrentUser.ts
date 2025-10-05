import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useCurrentUser() {
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      if (mounted) setEmail(user.email ?? "");

      // Try to read full_name from profiles (optional)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (mounted && profile?.full_name) setName(profile.full_name);
    }

    void load();
    return () => { mounted = false; };
  }, []);

  return { email, name };
}