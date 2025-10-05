import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { getUtilizationForWeek, getRoleCapacityVsDemand } from "../services/charts";
import { messageFromUnknown } from "../lib/safeSupabase";

/** Get the ISO Monday (YYYY-MM-DD) for a given Date */
function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay(); // 0..6
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Get first/last day (YYYY-MM-DD) of the month for a given Date */
function monthBounds(date: Date): { start: string; end: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  const s = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}`;
  const e = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}`;
  return { start: s, end: e };
}

export default function DashboardPage() {
  // Controls
  const [week, setWeek] = useState<string>(mondayOf(new Date()));
  const [monthDate, setMonthDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });

  // Data
  const [utilData, setUtilData] = useState<Array<{ person: string; utilization_pct: number }>>([]);
  const [roleData, setRoleData] = useState<Array<{ role: string; capacity_hrs: number; demand_hrs: number }>>([]);

  // UI
  const [error, setError] = useState<string>("");

  const monthRange = useMemo(() => {
    const d = new Date(monthDate);
    return monthBounds(d);
  }, [monthDate]);

  // Load data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError("");
        const [u, r] = await Promise.all([
          getUtilizationForWeek(week),
          getRoleCapacityVsDemand(monthRange.start, monthRange.end),
        ]);
        if (mounted) {
          if (u.ok) setUtilData(u.data); else setError(u.error);
          if (r.ok) setRoleData(r.data); else setError((prev) => prev || r.error);
        }
      } catch (err) {
        if (mounted) setError(messageFromUnknown(err));
      }
    })();
    return () => { mounted = false; };
  }, [week, monthRange]);

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" gutterBottom>Dashboard</Typography>

      {/* Controls */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            type="date"
            label="Week (Monday)"
            InputLabelProps={{ shrink: true }}
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            sx={{ maxWidth: 220 }}
          />
          <TextField
            type="month"
            label="Month (Capacity vs Demand)"
            InputLabelProps={{ shrink: true }}
            value={monthDate}
            onChange={(e) => setMonthDate(e.target.value + "-01")}
            sx={{ maxWidth: 240 }}
          />
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Chart 1: Utilization by person */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Utilization by Person (week starting {week})
        </Typography>
        <Box sx={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <BarChart data={utilData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="person" />
              <YAxis unit="%" />
              <Tooltip />
              <Legend />
              <Bar dataKey="utilization_pct" name="Utilization %" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Chart 2: Role capacity vs planned demand */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Role Capacity vs Planned Demand ({monthRange.start} → {monthRange.end})
        </Typography>
        <Box sx={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={roleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="capacity_hrs" name="Capacity (hrs)" />
              <Bar dataKey="demand_hrs" name="Planned Demand (hrs)" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Container>
  );
}