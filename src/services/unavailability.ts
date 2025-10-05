import { supabase } from "../lib/supabaseClient";
import type { Result } from "../lib/safeSupabase";
import { toResult } from "../lib/safeSupabase";

export interface Unavailability {
  id: number;
  person_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  reason: string | null;
}

export async function listUnavailability(
  personIds: number[],
  startDate: string,
  endDate: string
): Promise<Result<Unavailability[]>> {
  if (!personIds.length) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from("unavailability")
    .select("id, person_id, start_date, end_date, reason")
    .in("person_id", personIds)
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .order("person_id", { ascending: true });
  return toResult<Unavailability[]>(data, error);
}

export async function createUnavailability(
  payload: Omit<Unavailability, "id">
): Promise<Result<Unavailability>> {
  const { data: userData } = await supabase.auth.getUser();
  const created_by = userData.user?.id ?? null;

  const { data, error } = await supabase
    .from("unavailability")
    .insert({ ...payload, created_by })
    .select("id, person_id, start_date, end_date, reason")
    .single();

  return toResult<Unavailability>(data, error);
}