import { supabase } from "../lib/supabaseClient";
import type { Result } from "../lib/safeSupabase";
import { toResult } from "../lib/safeSupabase";

export interface Allocation {
  id: number;
  initiative_id: number;
  person_id: number;
  week_start: string; // YYYY-MM-DD (Monday)
  hours: number;
}

export async function upsertAllocation(
  payload: Omit<Allocation, "id">
): Promise<Result<null>> {
  const { data: userData } = await supabase.auth.getUser();
  const created_by = userData.user?.id ?? null;

  const { error } = await supabase
    .from("allocations")
    .upsert({ ...payload, created_by }, { onConflict: "initiative_id,person_id,week_start" });

  return error ? { ok: false, error: error.message, raw: error } : { ok: true, data: null };
}

export async function deleteAllocation(id: number): Promise<Result<null>> {
  const { error } = await supabase.from("allocations").delete().eq("id", id);
  return error ? { ok: false, error: error.message, raw: error } : { ok: true, data: null };
}

export async function listAllocationsForWeek(
  weekStart: string
): Promise<Result<Allocation[]>> {
  const { data, error } = await supabase
    .from("allocations")
    .select("id, initiative_id, person_id, week_start, hours")
    .eq("week_start", weekStart)
    .order("id", { ascending: false });

  return toResult<Allocation[]>(data, error);
}