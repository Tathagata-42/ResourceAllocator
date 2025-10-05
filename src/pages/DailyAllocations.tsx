import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import BlockIcon from "@mui/icons-material/Block";

import { listPeople } from "../services/people";
import { listInitiatives } from "../services/initiatives";
import type { Initiative } from "../services/initiatives";

import {
  listDailyAllocations,
  bulkUpsertDailyAllocations,
} from "../services/dailyAllocations";
import type { DailyAllocation } from "../services/dailyAllocations";

import { eachDay } from "../lib/dateRange";
import { messageFromUnknown } from "../lib/safeSupabase";

import { listUnavailability } from "../services/unavailability";
import type { Unavailability } from "../services/unavailability";

const SOFT_CAP = 6.5;            // hrs/day warning threshold
const COL_PX = 240;              // wider day columns
const PERSON_COL_PX = 260;       // wider person column
const TABLE_HEIGHT = "70vh";     // grid viewport height
const INPUT_WIDTH = 130;         // wider number input

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function DailyAllocationsPage() {
  // Datasets
  const [people, setPeople] = useState<{ id: number; full_name: string }[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);

  // Selections
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [initiativeId, setInitiativeId] = useState<number | "">("");
  const [start, setStart] = useState<string>(todayISO());
  const [end, setEnd] = useState<string>(todayISO());

  // Rows (ALL initiatives so we can compute day totals)
  const [rows, setRows] = useState<DailyAllocation[]>([]);
  const [unavail, setUnavail] = useState<Unavailability[]>([]);

  // UI state
  const [msg, setMsg] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [pRes, iRes] = await Promise.all([listPeople(), listInitiatives()]);
      if (pRes.ok) {
        const minimal = pRes.data.map(p => ({ id: p.id, full_name: p.full_name }));
        setPeople(minimal);
      }
      if (iRes.ok) setInitiatives(iRes.data);
    })();
  }, []);

  const dates = useMemo(() => (start && end ? eachDay(start, end) : []), [start, end]);

  async function onLoad() {
    setMsg({ type: "", text: "" });
    if (!selectedPeople.length || !start || !end) {
      setMsg({ type: "error", text: "Please select people and a date range." });
      return;
    }
    setLoading(true);
    try {
      const [allocRes, uRes] = await Promise.all([
        listDailyAllocations(selectedPeople, start, end),
        listUnavailability(selectedPeople, start, end),
      ]);
      if (allocRes.ok) setRows(allocRes.data); else setMsg({ type: "error", text: allocRes.error });
      if (uRes.ok) setUnavail(uRes.data); else setMsg(prev => prev.type ? prev : { type: "error", text: uRes.error });
    } catch (err) {
      setMsg({ type: "error", text: messageFromUnknown(err) });
    } finally {
      setLoading(false);
    }
  }

  /** Hours for the SELECTED initiative (editable value in the cell) */
  function hoursForSelectedInitiative(pid: number, date: string): number {
    if (!initiativeId) return 0;
    const r = rows.find(
      (r) => r.person_id === pid && r.date === date && r.initiative_id === initiativeId
    );
    return r ? Number(r.hours || 0) : 0;
  }

  /** Total hours that person has that day ACROSS ALL initiatives (for warning chip) */
  function totalDayHours(pid: number, date: string): number {
    return rows
      .filter((r) => r.person_id === pid && r.date === date)
      .reduce((acc, r) => acc + Number(r.hours || 0), 0);
  }

  function isBlocked(pid: number, date: string): { blocked: boolean; reason?: string } {
    // 🔹 1️⃣ Auto-block weekends for everyone
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) {
      return { blocked: true, reason: day === 0 ? "Sunday (Weekend)" : "Saturday (Weekend)" };
    }
  
    // 🔹 2️⃣ Check database unavailability
    for (const u of unavail) {
      if (u.person_id !== pid) continue;
      if (u.start_date <= date && date <= u.end_date) {
        return { blocked: true, reason: u.reason || "Unavailable" };
      }
    }
  
    return { blocked: false };
  }

  /** Edit value for SELECTED initiative; add row if missing */
  function setHoursForSelectedInitiative(pid: number, date: string, hours: number) {
    if (!initiativeId) {
      setMsg({ type: "error", text: "Please select an initiative to edit." });
      return;
    }
    const safe = Math.max(0, Math.min(24, Number.isFinite(hours) ? hours : 0));
    setRows((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex(
        (r) => r.person_id === pid && r.date === date && r.initiative_id === initiativeId
      );
      if (idx >= 0) {
        copy[idx] = { ...copy[idx], hours: safe };
      } else {
        copy.push({
          id: 0,
          initiative_id: initiativeId as number,
          person_id: pid,
          date,
          hours: safe,
        });
      }
      return copy;
    });
  }

  async function onSave() {
    setMsg({ type: "", text: "" });
    if (!rows.length) return;
    if (!initiativeId) {
      setMsg({ type: "error", text: "Select an initiative before saving changes." });
      return;
    }
    setSaving(true);
    try {
      // only write rows in current selection window (safety)
      const inWindow = rows.filter(
        (r) =>
          selectedPeople.includes(r.person_id) &&
          r.date >= start &&
          r.date <= end
      );
      const payload = inWindow.map((r) => ({
        initiative_id: r.initiative_id,
        person_id: r.person_id,
        date: r.date,
        hours: Number(r.hours || 0),
      }));
      const res = await bulkUpsertDailyAllocations(payload);
      if (res.ok) {
        setMsg({ type: "success", text: "Saved successfully." });
        await onLoad(); // refresh so totals reflect saved data immediately
      } else {
        setMsg({ type: "error", text: res.error });
      }
    } catch (err) {
      setMsg({ type: "error", text: messageFromUnknown(err) });
    } finally {
      setSaving(false);
    }
  }

  // ---- Styles for Excel-like grid (spacious) ----
  const tableWrapStyle: React.CSSProperties = {
    height: TABLE_HEIGHT,
    overflow: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
  };

  const tableStyle: React.CSSProperties = {
    width: "max-content",
    borderCollapse: "separate",
    borderSpacing: 0,
    tableLayout: "fixed",
  };

  const thBase: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 3,
    background: "#fafafa",
    borderBottom: "1px solid #e5e7eb",
    borderRight: "1px solid #e5e7eb",
    padding: "12px 10px",
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: "nowrap",
    textAlign: "center",
  };

  const thDate: React.CSSProperties = {
    ...thBase,
    width: COL_PX,
    minWidth: COL_PX,
    maxWidth: COL_PX,
  };

  const thPerson: React.CSSProperties = {
    ...thBase,
    left: 0,
    textAlign: "left",
    width: PERSON_COL_PX,
    minWidth: PERSON_COL_PX,
    maxWidth: PERSON_COL_PX,
    borderRight: "1px solid #e5e7eb",
    zIndex: 4,
  };

  const tdBase: React.CSSProperties = {
    borderBottom: "1px solid #eef2f7",
    borderRight: "1px solid #eef2f7",
    verticalAlign: "middle",
    background: "#ffffff",
  };

  const tdPerson: React.CSSProperties = {
    ...tdBase,
    padding: "12px 10px",
    position: "sticky",
    left: 0,
    zIndex: 2,
    background: "#fff",
    fontWeight: 700,
    width: PERSON_COL_PX,
    minWidth: PERSON_COL_PX,
    maxWidth: PERSON_COL_PX,
  };

  const tdCell: React.CSSProperties = {
    ...tdBase,
    padding: "12px 10px",
    width: COL_PX,
    minWidth: COL_PX,
    maxWidth: COL_PX,
  };

  // Column layout inside each cell: row 1 = controls (single-line), row 2 = total chip
  const cellInner: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  };

  // Single-line control row
  const controlRow: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    whiteSpace: "nowrap",
  };

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" gutterBottom>Daily Allocations</Typography>

      {/* Controls */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            select
            label="People"
            SelectProps={{ multiple: true }}
            value={selectedPeople}
            onChange={(e) => {
              const vals = e.target.value as unknown as (string | number)[];
              setSelectedPeople(vals.map((v) => Number(v)));
            }}
            sx={{ minWidth: 300 }}
          >
            {people.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.full_name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Initiative (to edit)"
            value={initiativeId}
            onChange={(e) => setInitiativeId(Number(e.target.value))}
            sx={{ minWidth: 300 }}
          >
            {initiatives.map((i) => (
              <MenuItem key={i.id} value={i.id}>
                {i.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="date"
            label="Start"
            InputLabelProps={{ shrink: true }}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <TextField
            type="date"
            label="End"
            InputLabelProps={{ shrink: true }}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <Stack display={"flex"} flexDirection={"row"} gap={"0.5rem"} marginLeft={"0.25rem"}>

          <Button variant="contained" onClick={onLoad} disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </Button>
          <Button variant="outlined" onClick={onSave} disabled={saving || !initiativeId}>
            {saving ? "Saving…" : "Save All"}
          </Button>
          </Stack>
        </Stack>

        {msg.type && <Alert sx={{ mt: 2 }} severity={msg.type}>{msg.text}</Alert>}
      </Paper>

      {/* Excel-like Matrix */}
      {dates.length > 0 && selectedPeople.length > 0 && (
        <Paper variant="outlined" sx={{ p: 0 }}>
          <Box style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thPerson}>Person</th>
                  {dates.map((d) => (
                    <th key={d} style={thDate}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedPeople.map((pid, rowIdx) => (
                  <tr key={pid} style={{ background: rowIdx % 2 === 0 ? "#fff" : "#fbfbfb" }}>
                    <td style={tdPerson}>
                      {people.find((p) => p.id === pid)?.full_name}
                    </td>
                    {dates.map((d) => {
                      const total = totalDayHours(pid, d);
                      const value = hoursForSelectedInitiative(pid, d);
                      const over = total > SOFT_CAP;
                      const { blocked, reason } = isBlocked(pid, d);

                      return (
                        <td key={d} style={{ ...tdCell, ...(blocked ? { background: "#f8fafc" } : {}) }}>
                          <div style={cellInner}>
                            {blocked ? (
                              <>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <BlockIcon fontSize="small" color="action" />
                                  <Typography variant="body2" color="text.secondary">
                                    {reason} (blocked)
                                  </Typography>
                                </Stack>
                                <Chip size="small" label="Unavailable" color="warning" variant="filled" />
                              </>
                            ) : (
                              <>
                                {/* Row 1: Controls in one line */}
                                {initiativeId ? (
                                  <div style={controlRow}>
                                    <IconButton
                                      size="small"
                                      aria-label="decrease"
                                      onClick={() => setHoursForSelectedInitiative(pid, d, value - 0.5)}
                                    >
                                      <RemoveIcon fontSize="small" />
                                    </IconButton>

                                    <TextField
                                      type="number"
                                      size="small"
                                      inputProps={{ min: 0, max: 24, step: 0.5 }}
                                      value={value}
                                      onChange={(e) =>
                                        setHoursForSelectedInitiative(pid, d, Number(e.target.value))
                                      }
                                      sx={{
                                        width: INPUT_WIDTH,
                                        "& input": {
                                          textAlign: "center",
                                          fontSize: 16,
                                          fontWeight: 700,
                                          paddingY: "10px",
                                        },
                                      }}
                                    />

                                    <IconButton
                                      size="small"
                                      aria-label="increase"
                                      onClick={() => setHoursForSelectedInitiative(pid, d, value + 0.5)}
                                    >
                                      <AddIcon fontSize="small" />
                                    </IconButton>
                                  </div>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    Select an initiative to edit
                                  </Typography>
                                )}

                                {/* Row 2: Total hours chip below, centered */}
                                <Tooltip
                                  title={
                                    over
                                      ? `Total ${total.toFixed(1)}h (> ${SOFT_CAP}h). This includes all initiatives.`
                                      : `Total ${total.toFixed(1)}h across all initiatives.`
                                  }
                                  arrow
                                >
                                  <Chip
                                    size="small"
                                    label={`${total.toFixed(1)}h`}
                                    color={over ? "warning" : "default"}
                                    variant={over ? "filled" : "outlined"}
                                    sx={{ mt: 0.5 }}
                                  />
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Paper>
      )}
    </Container>
  );
}