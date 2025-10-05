// src/services/initiatives.ts
import { supabase } from "../lib/supabaseClient";
import type { Result } from "../lib/safeSupabase";
import { toResult } from "../lib/safeSupabase";
import type { PostgrestError } from "@supabase/supabase-js";

export type Methodology = "AGILE" | "WATERFALL" | "HYBRID";
export type RoleCode = "BA" | "SA" | "PM" | "TESTER" | "DESIGNER" | "DEVELOPER";

export interface Initiative {
  id: number;
  name: string;
  methodology: Methodology;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

export async function createInitiative(
  payload: Omit<Initiative, "id">
): Promise<Result<Initiative>> {
  const { data, error } = await supabase
    .from("initiatives")
    .insert(payload)
    .select("id, name, methodology, start_date, end_date")
    .single();

  return toResult<Initiative>(data, error as PostgrestError | null);
}

export async function listInitiatives(): Promise<Result<Initiative[]>> {
  const { data, error } = await supabase
    .from("initiatives")
    .select("id, name, methodology, start_date, end_date")
    .order("id", { ascending: false });

  return toResult<Initiative[]>(data, error as PostgrestError | null);
}

/** Role demand */
export interface RoleDemandRow {
  role: RoleCode;
  planned_hours: number;
}

export async function getRoleDemand(
  initiativeId: number
): Promise<Result<RoleDemandRow[]>> {
  const { data, error } = await supabase
    .from("initiative_role_demand")
    .select("role, planned_hours")
    .eq("initiative_id", initiativeId)
    .order("role", { ascending: true });

  return toResult<RoleDemandRow[]>(data, error as PostgrestError | null);
}

/**
 * Upsert role demand into initiative_role_demand (columns: initiative_id, role, planned_hours).
 * Conflict target: (initiative_id, role)
 */
export async function upsertRoleDemand(
  initiativeId: number,
  rows: Array<{ role: RoleCode; planned_hours: number }>
): Promise<Result<null>> {
  const payload = rows.map((r) => ({
    initiative_id: initiativeId,
    role: r.role,
    planned_hours: r.planned_hours,
  }));

  const { error } = await supabase
    .from("initiative_role_demand")
    .upsert(payload, { onConflict: "initiative_id,role" });

  if (error) {
    return { ok: false, error: error.message, raw: error };
  }
  return { ok: true, data: null };
}

/** Team members attached to an initiative (via your initiative_people table) */
export interface TeamMember {
  person_id: number;
  full_name: string;
  role_code: RoleCode | null;
}

/** Raw row shape when joining */
type RawTeamRow =
  | {
      person_id: number;
      people: { full_name: string; role_code: RoleCode | null } | null;
    }
  | {
      person_id: number;
      people: { full_name: string; role_code: RoleCode | null }[] | null;
    };

/**
 * Reads from initiative_people and joins to people (via FK person_id) to get name + role_code.
 * If you prefer your view `initiative_people_v`, you can swap the query accordingly.
 */
export async function listInitiativeTeam(
  initiativeId: number
): Promise<Result<TeamMember[]>> {
  const { data, error } = await supabase
    .from("initiative_people")
    .select(`
      person_id,
      people:person_id ( full_name, role_code )
    `)
    .eq("initiative_id", initiativeId);

  const rows = (data ?? []) as RawTeamRow[];

  const mapped: TeamMember[] = rows.map((r) => {
    // Supabase can return object or array depending on relation config
    const p = Array.isArray(r.people) ? (r.people?.[0] ?? null) : r.people;
    return {
      person_id: r.person_id,
      full_name: p?.full_name ?? "",
      role_code: (p?.role_code ?? null) as RoleCode | null,
    };
  });

  return toResult<TeamMember[]>(mapped, error as PostgrestError | null);
}