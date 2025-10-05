import type { PostgrestError } from "@supabase/supabase-js";

/** Uniform result type for DB calls */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; raw?: PostgrestError | unknown };

/** Convert Supabase {data,error} into a safe Result<T> */
export function toResult<T>(data: T | null, error: PostgrestError | null): Result<T> {
  if (error) return { ok: false, error: error.message || "Database error", raw: error };
  if (data == null) return { ok: false, error: "No data returned" };
  return { ok: true, data };
}

/** Safely extract a message from unknown errors */
export function messageFromUnknown(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unexpected error";
}