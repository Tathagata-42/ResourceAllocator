import { supabase } from "../lib/supabaseClient";
import { toResult, type Result } from "../lib/safeSupabase";
import type { PostgrestError } from "@supabase/supabase-js";

export interface Person {
  id: number;
  full_name: string;
  role_code: string;                 // ← FK to roles.code
  email?: string | null;
  active?: boolean | null;
  daily_capacity?: number | null;    // default 6.5 in DB
  weekly_capacity_hours?: number | null;
}

export async function listPeople(): Promise<Result<Person[]>> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .order("full_name", { ascending: true });
  return toResult<Person[]>(data as Person[] | null, error as PostgrestError | null);
}

export interface NewPerson {
  full_name: string;
  role_code: string;                 // ← pick from roles list
  email?: string | null;
  daily_capacity?: number;           // optional; DB defaults to 6.5
  weekly_capacity_hours?: number;    // optional
  active?: boolean;                  // optional
}

export async function createPerson(input: NewPerson): Promise<Result<Person>> {
  const payload: Record<string, unknown> = {
    full_name: input.full_name.trim(),
    role_code: input.role_code,
  };
  if (typeof input.email !== "undefined") payload.email = input.email ?? null;
  if (typeof input.daily_capacity !== "undefined") payload.daily_capacity = input.daily_capacity;
  if (typeof input.weekly_capacity_hours !== "undefined") payload.weekly_capacity_hours = input.weekly_capacity_hours;
  if (typeof input.active !== "undefined") payload.active = input.active;

  const { data, error } = await supabase
    .from("people")
    .insert(payload)
    .select("*")
    .single();

  return toResult<Person>(data as Person | null, error as PostgrestError | null);
}
export interface UpdatePersonInput {
    id: number;
    full_name?: string;
    role_code?: string;
    email?: string | null;
    active?: boolean;
    daily_capacity?: number | null;
    weekly_capacity_hours?: number | null;
  }
  
  export async function updatePerson(input: UpdatePersonInput): Promise<Result<Person>> {
    const { id, ...patch } = input;
    const { data, error } = await supabase
      .from("people")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
  
    return toResult<Person>(data as Person | null, error as PostgrestError | null);
  }