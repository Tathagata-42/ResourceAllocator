import { supabase } from "../lib/supabaseClient";
import type { PostgrestError } from "@supabase/supabase-js";
import { toResult } from "../lib/safeSupabase";
import type { Result } from "../lib/safeSupabase";

/** Row returned by auto_alloc_preview_named */
export interface PreviewAllocation {
  initiative_id: number;
  initiative_name: string;
  person_id: number;
  person_name: string;
  role_code: string;
  day: string;   // YYYY-MM-DD
  hours: number;
}

export type ApplyAction = "inserted" | "updated" | "skipped";

/** Row returned by auto_alloc_apply */
export interface ApplyResultRow {
  out_initiative_id: number;
  out_person_id: number;
  out_day: string;   // YYYY-MM-DD
  out_hours: number;
  out_action: ApplyAction;
}

/**
 * Get the auto-allocation PREVIEW (named) for a given initiative.
 * If `selectedPeople` is omitted or empty, the DB function should use the eligible pool.
 */
export async function previewAllocations(
  initiativeId: number,
  selectedPeople?: number[]
): Promise<Result<PreviewAllocation[]>> {
  const payload = {
    p_initiative_id: initiativeId,
    p_selected_people: (selectedPeople && selectedPeople.length > 0) ? selectedPeople : null,
  };

  const { data, error } = await supabase.rpc("auto_alloc_preview_named", payload);
  return toResult<PreviewAllocation[]>(data, error as PostgrestError | null);
}

/**
 * APPLY the allocation (fill-only or overwrite) based on the current DB functions.
 * - `overwrite = false` → only fill empty cells
 * - `overwrite = true`  → replace existing hours for matching cells
 */
export async function applyAllocations(
  initiativeId: number,
  selectedPeople?: number[],
  overwrite: boolean = false
): Promise<Result<ApplyResultRow[]>> {
  const payload = {
    p_initiative_id: initiativeId,
    p_selected_people: (selectedPeople && selectedPeople.length > 0) ? selectedPeople : null,
    p_overwrite: overwrite,
  };

  const { data, error } = await supabase.rpc("auto_alloc_apply", payload);
  return toResult<ApplyResultRow[]>(data, error as PostgrestError | null);
}