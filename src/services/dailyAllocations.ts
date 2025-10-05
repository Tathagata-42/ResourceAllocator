import { supabase } from "../lib/supabaseClient";
import type { Result } from "../lib/safeSupabase";
import { toResult } from "../lib/safeSupabase";

export interface DailyAllocation {
  id: number;
  initiative_id: number;
  person_id: number;
  date: string;  // YYYY-MM-DD
  hours: number; // e.g., 2.5
}

/** Get daily allocations for a set of people within a date range (inclusive) */
export async function listDailyAllocations(
  personIds: number[],
  startDate: string,
  endDate: string
): Promise<Result<DailyAllocation[]>> {
  if (!personIds.length) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from("daily_allocations")
    .select("id, initiative_id, person_id, date, hours")
    .in("person_id", personIds)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("person_id", { ascending: true })
    .order("date", { ascending: true });
  return toResult<DailyAllocation[]>(data, error);
}

/** Bulk upsert: one row per (initiative_id, person_id, date) */
export async function bulkUpsertDailyAllocations(
  rows: Array<Omit<DailyAllocation, "id">>
): Promise<Result<null>> {
  if (!rows.length) return { ok: true, data: null };
  const { data: userData } = await supabase.auth.getUser();
  const created_by = userData.user?.id ?? null;

  const payload = rows.map(r => ({ ...r, created_by }));
  const { error } = await supabase
    .from("daily_allocations")
    .upsert(payload, { onConflict: "initiative_id,person_id,date" });

  return error ? { ok: false, error: error.message, raw: error } : { ok: true, data: null };
}
// add near the top
export type AllocationViewRow = {
    id: number;
    date: string;            // YYYY-MM-DD
    person_name: string;
    role_code: string;
    initiative_name: string;
    hours: number;
  };
  
  // update the return type of listAllocationsByPerson
  export async function listAllocationsByPerson(personName: string) {
    const { data, error } = await supabase
      .from("daily_allocations_view")
      .select("*")
      .eq("person_name", personName)
      .order("date", { ascending: true });
  
    return toResult<AllocationViewRow[]>(data as AllocationViewRow[] | null, error);
  }