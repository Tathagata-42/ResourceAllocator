/** Returns YYYY-MM-DD strings from start..end inclusive (UTC-safe) */
export function eachDay(startISO: string, endISO: string): string[] {
    const out: string[] = [];
    const s = new Date(startISO + "T00:00:00Z");
    const e = new Date(endISO + "T00:00:00Z");
    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      out.push(`${yyyy}-${mm}-${dd}`);
    }
    return out;
  }