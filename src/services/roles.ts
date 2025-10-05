import { supabase } from "../lib/supabaseClient";
import { toResult, type Result } from "../lib/safeSupabase";
import type { PostgrestError } from "@supabase/supabase-js";

export interface Role {
  code: string; // e.g., 'BA'
  name: string; // 'Business Analyst'
}

export async function listRoles(): Promise<Result<Role[]>> {
  const { data, error } = await supabase
    .from("roles")
    .select("code, name")
    .order("name", { ascending: true });
  return toResult<Role[]>(data as Role[] | null, error as PostgrestError | null);
}