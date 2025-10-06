// client/src/services/rollForward.ts
import { supabase } from "../lib/supabaseClient";
import type { Result } from "../lib/safeSupabase";
import { toResult } from "../lib/safeSupabase";
import type { PostgrestError } from "@supabase/supabase-js";

export type AdjustmentRow = {
  day: string;           // YYYY-MM-DD
  before_hours: number;
  after_hours: number;
  reduced: number;
};

export async function logActualAndAdjust(params: {
  initiativeId: number;
  personId: number;
  day: string;          // YYYY-MM-DD
  actual: number;
  step?: number;        // default 0.5
  minDays?: number;     // default 2
}): Promise<Result<AdjustmentRow[]>> {
  const { initiativeId, personId, day, actual, step = 0.5, minDays = 2 } = params;

  const { data, error } = await supabase.rpc("roll_forward_overrun", {
    p_initiative_id: initiativeId,
    p_person_id: personId,
    p_day: day,
    p_actual: actual,
    p_step: step,
    p_min_days: minDays,
  });

  return toResult<AdjustmentRow[]>(data, error as PostgrestError | null);
}