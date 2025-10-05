// client/src/pages/AvailabilityPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Container, MenuItem, Paper, Stack, TextField, Typography,
} from "@mui/material";

import { listPeople } from "../services/people";
import type { Person } from "../services/people";

import { listDailyAllocations } from "../services/dailyAllocations";
import type { DailyAllocation } from "../services/dailyAllocations";

import { eachDay } from "../lib/dateRange";
import { messageFromUnknown } from "../lib/safeSupabase";

const SOFT_CAP = 6.5;

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AvailabilityPage() {
  // datasets
  const [people, setPeople] = useState<Person[]>([]);
  // filters
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [start, setStart] = useState<string>(todayISO());
  const [end, setEnd] = useState<string>(todayISO());
  // data
  const [rows, setRows] = useState<DailyAllocation[]>([]);
  // ui
  const [msg, setMsg] = useState<{type:""|"success"|"error"; text:string}>({type:"", text:""});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await listPeople();
      if (res.ok) {
        setPeople(res.data);
        setSelectedPeople(res.data.map(p => p.id)); // default: everyone
      }
    })();
  }, []);

  const dates = useMemo(() => (start && end ? eachDay(start, end) : []), [start, end]);

  async function onLoad() {
    setMsg({type:"", text:""});
    if (!selectedPeople.length || !start || !end) {
      setMsg({type:"error", text:"Pick people and a date range."});
      return;
    }
    setLoading(true);
    try {
      const res = await listDailyAllocations(selectedPeople, start, end);
      if (res.ok) setRows(res.data);
      else setMsg({type:"error", text: res.error});
    } catch (err) {
      setMsg({type:"error", text: messageFromUnknown(err)});
    } finally {
      setLoading(false);
    }
  }

  // helpers
  function totalFor(pid: number, date: string): number {
    return rows
      .filter(r => r.person_id === pid && r.date === date)
      .reduce((s, r) => s + Number(r.hours || 0), 0);
  }
  function capFor(pid: number): number {
    return people.find(p => p.id === pid)?.daily_capacity ?? SOFT_CAP;
  }

  // simple, readable grid styles
  const wrap: React.CSSProperties = { overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: "70vh" };
  const table: React.CSSProperties = { width: "max-content", borderCollapse: "separate", borderSpacing: 0 };
  const th: React.CSSProperties = { position:"sticky", top:0, background:"#fafafa", borderBottom:"1px solid #e5e7eb", padding:"10px 12px", fontWeight:700, whiteSpace:"nowrap" };
  const rowHead: React.CSSProperties = { position:"sticky", left:0, background:"#fff", borderRight:"1px solid #e5e7eb", padding:"10px 12px", fontWeight:700 };
  const td: React.CSSProperties = { borderBottom:"1px solid #eef2f7", borderRight:"1px solid #eef2f7", padding:"8px 10px", minWidth: 180 };

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" gutterBottom>Availability</Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField
            select
            label="People"
            SelectProps={{ multiple: true }}
            value={selectedPeople}
            onChange={(e) => {
              const vals = e.target.value as unknown as (string|number)[];
              setSelectedPeople(vals.map(v => Number(v)));
            }}
            sx={{ minWidth: 320 }}
          >
            {people.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.full_name}</MenuItem>
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

          <Button variant="contained" onClick={onLoad} disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </Button>
        </Stack>

        {msg.type && <Alert sx={{ mt:2 }} severity={msg.type}>{msg.text}</Alert>}
      </Paper>

      {dates.length > 0 && selectedPeople.length > 0 && (
        <Paper variant="outlined">
          <Box style={wrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={{...th, left:0, zIndex:2, position:"sticky"}}>Person</th>
                  {dates.map(d => (
                    <th key={d} style={th}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedPeople.map((pid, i) => (
                  <tr key={pid} style={{ background: i % 2 ? "#fbfbfb" : "#fff" }}>
                    <td style={rowHead}>{people.find(p => p.id === pid)?.full_name}</td>
                    {dates.map(d => {
                      const total = totalFor(pid, d);
                      const cap = capFor(pid);
                      const free = Math.max(0, cap - total);
                      const weekend = (() => {
                        const dt = new Date(d);
                        const dow = dt.getDay(); // 0 Sun, 6 Sat
                        return dow === 0 || dow === 6;
                      })();

                      return (
                        <td key={d} style={{ ...td, background: weekend ? "#f8fafc" : undefined }}>
                          <Stack spacing={0.5}>
                            <Typography variant="body2">
                              {total > 0 ? `${total.toFixed(1)}h booked` : "—"}
                            </Typography>
                            <Typography variant="caption" color={total > cap ? "warning.main" : "text.secondary"}>
                              {free.toFixed(1)}h free (cap {cap.toFixed(1)})
                            </Typography>
                          </Stack>
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