import { supabase } from "../lib/supabaseClient";
import type { Result } from "../lib/safeSupabase";
// import type { toResult } from "../lib/safeSupabase";

/** Utilization rows: person name + utilization percentage for a given ISO Monday */
export async function getUtilizationForWeek(week: string): Promise<Result<Array<{ person: string; utilization_pct: number }>>> {
  const [{ data: people, error: pErr }, { data: allocs, error: aErr }] = await Promise.all([
    supabase.from("people").select("id, full_name, weekly_capacity_hours, active").eq("active", true),
    supabase.from("allocations").select("person_id, hours").eq("week_start", week),
  ]);

  if (pErr) return { ok: false, error: pErr.message, raw: pErr };
  if (aErr) return { ok: false, error: aErr.message, raw: aErr };
  if (!people) return { ok: false, error: "No data returned for people" };

  const map: Record<number, { name: string; cap: number; alloc: number }> = {};
  people.forEach((p) => (map[p.id] = { name: p.full_name, cap: p.weekly_capacity_hours, alloc: 0 }));
  (allocs || []).forEach((a) => { if (map[a.person_id]) map[a.person_id].alloc += a.hours; });

  const rows = Object.values(map).map((p) => ({
    person: p.name,
    utilization_pct: p.cap ? Math.round(((p.alloc / p.cap) * 100 + Number.EPSILON) * 10) / 10 : 0,
  }));

  return { ok: true, data: rows };
}

/** Role capacity vs demand inside [start,end] inclusive (YYYY-MM-DD) */
export async function getRoleCapacityVsDemand(start: string, end: string): Promise<Result<Array<{ role: string; capacity_hrs: number; demand_hrs: number }>>> {
  const [{ data: ppl, error: pErr }, { data: demand, error: dErr }] = await Promise.all([
    supabase.from("people").select("role, weekly_capacity_hours, active").eq("active", true),
    supabase
      .from("initiative_role_demand")
      .select("role, planned_hours, initiatives!inner(start_date,end_date)")
      .gte("initiatives.start_date", start)
      .lte("initiatives.end_date", end),
  ]);

  if (pErr) return { ok: false, error: pErr.message, raw: pErr };
  if (dErr) return { ok: false, error: dErr.message, raw: dErr };

  const cap: Record<string, number> = {};
  (ppl || []).forEach((p) => (cap[p.role] = (cap[p.role] || 0) + p.weekly_capacity_hours));

  const dem: Record<string, number> = {};
  (demand || []).forEach((d) => (dem[d.role] = (dem[d.role] || 0) + d.planned_hours));

  const ROLES = ["BA", "SA", "PM", "TESTER", "DESIGNER"];
  const rows = ROLES.map((r) => ({
    role: r,
    capacity_hrs: cap[r] || 0,
    demand_hrs: dem[r] || 0,
  }));

  return { ok: true, data: rows };
}