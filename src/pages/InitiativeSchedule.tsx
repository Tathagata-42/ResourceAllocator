import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Container,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { listInitiatives, type Initiative } from "../services/initiatives";
import { listInitiativeTeam, type TeamMember } from "../services/initiatives";
import { listDailyAllocations, type DailyAllocation } from "../services/dailyAllocations";
import { messageFromUnknown } from "../lib/safeSupabase";
import { eachDay } from "../lib/dateRange";

const COL_PX = 140;
const PERSON_COL_PX = 260;
const TABLE_HEIGHT = "70vh";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function plusDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function InitiativeSchedulePage() {
  // picks
  const [initiativeId, setInitiativeId] = useState<number | "">("");
  const [start, setStart] = useState<string>(todayISO());
  const [end, setEnd] = useState<string>(plusDays(todayISO(), 14));

  // data
  const [inits, setInits] = useState<Initiative[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [allocs, setAllocs] = useState<DailyAllocation[]>([]);

  // ui
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  const dates = useMemo(() => (start && end ? eachDay(start, end) : []), [start, end]);

  // bootstrap initiatives
  useEffect(() => {
    (async () => {
      const res = await listInitiatives();
      if (res.ok) setInits(res.data);
      else setMsg({ type: "error", text: res.error });
    })();
  }, []);

  // load team when initiative changes
  useEffect(() => {
    if (!initiativeId) {
      setTeam([]);
      setAllocs([]);
      return;
    }
    (async () => {
      setLoading(true);
      setMsg({ type: "", text: "" });
      try {
        const t = await listInitiativeTeam(initiativeId as number);
        if (!t.ok) {
          setMsg({ type: "error", text: t.error });
          setTeam([]);
          setAllocs([]);
          return;
        }
        setTeam(t.data);

        // fetch allocations for TEAM over range, then filter to this initiative
        const ids = t.data.map((p) => p.person_id);
        if (ids.length && start && end) {
          const a = await listDailyAllocations(ids, start, end);
          if (a.ok) setAllocs(a.data.filter((r) => r.initiative_id === initiativeId));
          else setMsg({ type: "error", text: a.error });
        } else {
          setAllocs([]);
        }
      } catch (err) {
        setMsg({ type: "error", text: messageFromUnknown(err) });
      } finally {
        setLoading(false);
      }
    })();
  }, [initiativeId, start, end]);

  // maps for quick lookup
//   const teamById = useMemo(() => new Map(team.map((t) => [t.person_id, t])), [team]);

  // helper: hours for (person, date) ON THIS initiative
  function hoursFor(pid: number, date: string): number {
    const row = allocs.find((r) => r.person_id === pid && r.date === date);
    return row ? Number(row.hours || 0) : 0;
  }

  // styles
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
  const thDate: React.CSSProperties = { ...thBase, width: COL_PX, minWidth: COL_PX, maxWidth: COL_PX };
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
    textAlign: "center",
  };

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" gutterBottom>Initiative Schedule</Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField
            select
            label="Initiative"
            value={initiativeId}
            onChange={(e) => setInitiativeId(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ minWidth: 320 }}
          >
            <MenuItem value="">Select an initiative…</MenuItem>
            {inits.map((i) => (
              <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
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
        </Stack>

        {loading && <Box sx={{ mt: 2 }}><LinearProgress /></Box>}
        {msg.type && <Alert sx={{ mt: 2 }} severity={msg.type}>{msg.text}</Alert>}
      </Paper>

      {initiativeId && (
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
                {team.length === 0 ? (
                  <tr>
                    <td style={{ ...tdPerson, fontWeight: 500 }} colSpan={1 + dates.length}>
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                        No team members attached to this initiative.
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  team
                    .slice()
                    .sort((a, b) => a.full_name.localeCompare(b.full_name))
                    .map((t, rowIdx) => (
                      <tr key={t.person_id} style={{ background: rowIdx % 2 === 0 ? "#fff" : "#fbfbfb" }}>
                        <td style={tdPerson}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <span>{t.full_name}</span>
                            {t.role_code && (
                              <Chip size="small" label={t.role_code} variant="outlined" />
                            )}
                          </Stack>
                        </td>
                        {dates.map((d) => {
                          const h = hoursFor(t.person_id, d);
                          const isBlocked = h > 0;
                          return (
                            <td key={d} style={tdCell}>
                              {isBlocked ? (
                                <Tooltip title={`${t.full_name} is booked ${h}h on this initiative`} arrow>
                                  <Chip size="small" color="primary" label={`${h}h`} />
                                </Tooltip>
                              ) : (
                                <Chip size="small" variant="outlined" label="—" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </Box>
        </Paper>
      )}
    </Container>
  );
}