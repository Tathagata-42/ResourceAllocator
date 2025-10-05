import { supabase } from "../lib/supabaseClient";
import { toResult } from "../lib/safeSupabase";
import type { Result } from "../lib/safeSupabase";
import type { PostgrestError } from "@supabase/supabase-js";

export interface InitiativeMember {
  initiative_id: number;
  person_id: number;
  role_override?: string | null;
}

export async function listInitiativePeople(initiativeId: number): Promise<Result<InitiativeMember[]>> {
  const { data, error } = await supabase
    .from("initiative_people")
    .select("initiative_id, person_id, role_override")
    .eq("initiative_id", initiativeId);
  return toResult<InitiativeMember[]>(data, error as PostgrestError | null);
}

export async function setInitiativePeople(initiativeId: number, peopleIds: number[]): Promise<Result<null>> {
  // replace-all semantics
  const del = await supabase.from("initiative_people").delete().eq("initiative_id", initiativeId);
  if (del.error) return { ok: false, error: del.error.message, raw: del.error };

  const rows = peopleIds.map(pid => ({ initiative_id: initiativeId, person_id: pid }));
  const { error } = await supabase.from("initiative_people").insert(rows);
  return error ? { ok: false, error: error.message, raw: error } : { ok: true, data: null };
}