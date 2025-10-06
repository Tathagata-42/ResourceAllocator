import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";

import { listPeople } from "../services/people";
import { listInitiatives } from "../services/initiatives";
import type { Initiative } from "../services/initiatives";

import {
  listDailyAllocations,
  bulkUpsertDailyAllocations,
} from "../services/dailyAllocations";
import type { DailyAllocation } from "../services/dailyAllocations";

import { listUnavailability } from "../services/unavailability";
import type { Unavailability } from "../services/unavailability";

import { messageFromUnknown } from "../lib/safeSupabase";

// NEW: actuals dialog
import LogActualDialog from "../components/LogActualDialog";

const SOFT_CAP = 6.5;

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function HuddlePage() {
  // Picks
  const [date, setDate] = useState<string>(todayISO());
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);

  // Data
  const [people, setPeople] = useState<{ id: number; full_name: string }[]>([]);
  const [inits, setInits] = useState<Initiative[]>([]);
  const [rows, setRows] = useState<DailyAllocation[]>([]);
  const [unavail, setUnavail] = useState<Unavailability[]>([]);

  // NEW: Log actual dialog state
  const [actualDlgOpen, setActualDlgOpen] = useState(false);
  const [actualCtx, setActualCtx] = useState<{
    initiativeId: number;
    personId: number;
    date: string;
    planned: number;
    personName?: string;
    initiativeName?: string;
  } | null>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  // Bootstrap data
  useEffect(() => {
    (async () => {
      const [pRes, iRes] = await Promise.all([listPeople(), listInitiatives()]);
      if (pRes.ok) {
        const minimal = pRes.data.map(p => ({ id: p.id, full_name: p.full_name }));
        setPeople(minimal);
        setSelectedPeople(minimal.map(p => p.id)); // default: everyone
      }
      if (iRes.ok) setInits(iRes.data);
    })();
  }, []);

  // Load allocations for the chosen day
  async function loadDay() {
    setMsg({ type: "", text: "" });
    if (!selectedPeople.length || !date) {
      setMsg({ type: "error", text: "Pick at least one person and a date." });
      return;
    }
    setLoading(true);
    try {
      const [allocRes, unRes] = await Promise.all([
        listDailyAllocations(selectedPeople, date, date),
        listUnavailability(selectedPeople, date, date),
      ]);
      if (allocRes.ok) setRows(allocRes.data); else setMsg({ type: "error", text: allocRes.error });
      if (unRes.ok) setUnavail(unRes.data); else setMsg(prev => prev.type ? prev : { type: "error", text: unRes.error });
    } catch (err) {
      setMsg({ type: "error", text: messageFromUnknown(err) });
    } finally {
      setLoading(false);
    }
  }

  // ---------- Grouped-by-person view ----------
  type PersonRow = {
    person_id: number;
    person_name: string;
    items: {
      initiative_id: number;
      initiative_name: string;
      hours: number;
    }[];
    blocked: boolean;
    reason?: string;
  };

  const persons: PersonRow[] = useMemo(() => {
    const byId = new Map(people.map(p => [p.id, p.full_name]));
    const initName = new Map(inits.map(i => [i.id, i.name]));

    // weekend auto-block
    const d = new Date(date);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    function blockedFor(pid: number): { blocked: boolean; reason?: string } {
      if (isWeekend) {
        return { blocked: true, reason: d.getDay() === 0 ? "Sunday (Weekend)" : "Saturday (Weekend)" };
      }
      for (const u of unavail) {
        if (u.person_id !== pid) continue;
        if (u.start_date <= date && date <= u.end_date) {
          return { blocked: true, reason: u.reason || "Unavailable" };
        }
      }
      return { blocked: false };
    }

    // Only this day + selected people
    const forDay = rows.filter(r => r.date === date && selectedPeople.includes(r.person_id));

    // Group by person into map
    const map = new Map<number, PersonRow>();
    for (const r of forDay) {
      const pid = r.person_id;
      const pr = map.get(pid) ?? {
        person_id: pid,
        person_name: byId.get(pid) ?? `#${pid}`,
        items: [],
        ...blockedFor(pid),
      };
      pr.items.push({
        initiative_id: r.initiative_id,
        initiative_name: initName.get(r.initiative_id) ?? `#${r.initiative_id}`,
        hours: Number(r.hours || 0),
      });
      map.set(pid, pr);
    }

    // Ensure people with no rows still appear (with empty items)
    for (const pid of selectedPeople) {
      if (!map.has(pid)) {
        const b = blockedFor(pid);
        map.set(pid, {
          person_id: pid,
          person_name: byId.get(pid) ?? `#${pid}`,
          items: [],
          ...b,
        });
      }
    }

    // Sort by person name
    return Array.from(map.values()).sort((a, b) => a.person_name.localeCompare(b.person_name));
  }, [rows, people, inits, selectedPeople, date, unavail]);

  function totalForPerson(pid: number): number {
    const p = persons.find(x => x.person_id === pid);
    if (!p) return 0;
    return p.items.reduce((s, it) => s + it.hours, 0);
  }

  function setItemHours(personId: number, initiativeId: number, hours: number) {
    const safe = Math.max(0, Math.min(24, Number.isFinite(hours) ? hours : 0));
    setRows(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(r =>
        r.person_id === personId &&
        r.initiative_id === initiativeId &&
        r.date === date
      );
      if (idx >= 0) copy[idx] = { ...copy[idx], hours: safe };
      else copy.push({ id: 0, person_id: personId, initiative_id: initiativeId, date, hours: safe });
      return copy;
    });
  }

  async function saveAll() {
    setMsg({ type: "", text: "" });
    if (!date) return;
    setSaving(true);
    try {
      const payload = rows
        .filter(r => r.date === date && selectedPeople.includes(r.person_id))
        .map(r => ({
          person_id: r.person_id,
          initiative_id: r.initiative_id,
          date: r.date,
          hours: Number(r.hours || 0),
        }));
      const res = await bulkUpsertDailyAllocations(payload);
      if (res.ok) {
        setMsg({ type: "success", text: "Saved changes." });
        await loadDay();
      } else {
        setMsg({ type: "error", text: res.error });
      }
    } catch (err) {
      setMsg({ type: "error", text: messageFromUnknown(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" gutterBottom>Huddle — Today’s Allocations</Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField
            type="date"
            label="Date"
            InputLabelProps={{ shrink: true }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <TextField
            select
            label="People"
            SelectProps={{ multiple: true }}
            value={selectedPeople}
            onChange={(e) => {
              const vals = e.target.value as unknown as (string | number)[];
              setSelectedPeople(vals.map(v => Number(v)));
            }}
            sx={{ minWidth: 320 }}
          >
            {people.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.full_name}</MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={loadDay} disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </Button>
          <Button variant="outlined" onClick={saveAll} disabled={saving}>
            {saving ? "Saving…" : "Save All"}
          </Button>
        </Stack>

        {msg.type && <Alert sx={{ mt: 2 }} severity={msg.type}>{msg.text}</Alert>}
      </Paper>

      <Paper variant="outlined">
        <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", gap: 2, fontWeight: 700 }}>
          <Box sx={{ width: "28%" }}>Name</Box>
          <Box sx={{ width: "72%" }}>Allocations (Project & Hours)</Box>
        </Box>

        {persons.length === 0 ? (
          <Box sx={{ p: 3, color: "text.secondary" }}>No allocations for this date.</Box>
        ) : (
          persons.map((p, idx) => {
            const total = totalForPerson(p.person_id);
            const over = total > SOFT_CAP;

            return (
              <Box
                key={p.person_id}
                sx={{
                  display: "flex",
                  gap: 2,
                  px: 1.5,
                  py: 1.25,
                  borderTop: idx === 0 ? "none" : "1px solid",
                  borderColor: "divider",
                  bgcolor: p.blocked ? "#f8fafc" : "transparent",
                  alignItems: "flex-start",
                }}
              >
                {/* Left: Person */}
                <Box sx={{ width: "28%", display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{p.person_name}</Typography>
                  <Tooltip
                    title={
                      p.blocked
                        ? (p.reason || "Unavailable")
                        : (over ? `Total ${total.toFixed(1)}h (> ${SOFT_CAP}h)` : `Total ${total.toFixed(1)}h`)
                    }
                    arrow
                  >
                    <Chip
                      size="small"
                      label={`${total.toFixed(1)}h`}
                      color={p.blocked ? "warning" : over ? "warning" : "default"}
                      variant={over || p.blocked ? "filled" : "outlined"}
                    />
                  </Tooltip>
                  {p.blocked && <BlockIcon fontSize="small" color="action" />}
                </Box>

                {/* Right: Allocations list (each item = two lines + Log actual button) */}
                <Box sx={{ width: "72%", display: "grid", gap: 1.25 }}>
                  {p.items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {p.blocked ? (p.reason || "Unavailable") : "No allocations yet."}
                    </Typography>
                  ) : (
                    p.items.map(item => (
                      <Paper
                        key={item.initiative_id}
                        variant="outlined"
                        sx={{ p: 1, display: "grid", rowGap: 0.5 }}
                      >
                        {/* Line 1: Project name */}
                        <Typography sx={{ fontWeight: 600 }}>{item.initiative_name}</Typography>

                        {/* Line 2: Editable hours + Log actual */}
                        {p.blocked ? (
                          <Chip size="small" color="warning" label={p.reason || "Unavailable"} />
                        ) : (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <TextField
                              type="number"
                              size="small"
                              inputProps={{ min: 0, max: 24, step: 0.5 }}
                              value={item.hours}
                              onChange={(e) => setItemHours(p.person_id, item.initiative_id, Number(e.target.value))}
                              sx={{
                                maxWidth: 140,
                                "& input": { textAlign: "center", fontSize: 16, fontWeight: 700, py: 1 },
                              }}
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setActualCtx({
                                  initiativeId: item.initiative_id,
                                  personId: p.person_id,
                                  date,
                                  planned: Number(item.hours || 0),
                                  personName: p.person_name,
                                  initiativeName: item.initiative_name,
                                });
                                setActualDlgOpen(true);
                              }}
                            >
                              Log actual
                            </Button>
                          </Box>
                        )}
                      </Paper>
                    ))
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Paper>

      {/* Log Actual dialog */}
      {actualDlgOpen && actualCtx && (
        <LogActualDialog
          open={actualDlgOpen}
          onClose={() => setActualDlgOpen(false)}
          initiativeId={actualCtx.initiativeId}
          personId={actualCtx.personId}
          date={actualCtx.date}
          planned={actualCtx.planned}
          personName={actualCtx.personName}
          initiativeName={actualCtx.initiativeName}
          onSuccess={() => {
            setActualDlgOpen(false);
            void loadDay();
          }}
        />
      )}
    </Container>
  );
}