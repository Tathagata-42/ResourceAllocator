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
  Typography,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { listInitiatives } from "../services/initiatives";
import type { Initiative } from "../services/initiatives";

import { listPeople } from "../services/people";
import type { Person } from "../services/people";

import {
  upsertAllocation,
  deleteAllocation,
  listAllocationsForWeek,
} from "../services/allocations";
import type { Allocation } from "../services/allocations";

import { messageFromUnknown } from "../lib/safeSupabase";
import AutoAllocPreviewModal from "../components/AutoAllocPreviewModal";

function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay(); // 0..6 (Sun..Sat)
  const diff = day === 0 ? -6 : 1 - day; // to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AllocationsPage() {
  // Data
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [rows, setRows] = useState<Allocation[]>([]);

  // Form
  const [initiativeId, setInitiativeId] = useState<number | null>(null);
  const [personId, setPersonId] = useState<number | "">("");
  const [weekStart, setWeekStart] = useState<string>(mondayOf(new Date()));
  const [hours, setHours] = useState<number>(0);

  // Auto-Allocate modal
  const [autoAllocOpen, setAutoAllocOpen] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | ""; text: string }>({
    type: "",
    text: "",
  });

  // Lookup maps for display
  const initiativeNameById = useMemo(() => {
    const m = new Map<number, string>();
    initiatives.forEach((i) => m.set(i.id, i.name));
    return m;
  }, [initiatives]);

  const personNameById = useMemo(() => {
    const m = new Map<number, string>();
    people.forEach((p) => m.set(p.id, p.full_name));
    return m;
  }, [people]);

  const canAutoAlloc = typeof initiativeId === "number" && !Number.isNaN(initiativeId);

  async function loadBase() {
    setLoading(true);
    try {
      const [iRes, pRes] = await Promise.all([listInitiatives(), listPeople()]);
      if (iRes.ok) setInitiatives(iRes.data);
      if (pRes.ok) setPeople(pRes.data);
    } finally {
      setLoading(false);
    }
  }

  async function loadWeek(w: string) {
    const res = await listAllocationsForWeek(w);
    if (res.ok) setRows(res.data);
  }

  useEffect(() => {
    (async () => {
      await loadBase();
      await loadWeek(weekStart);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadWeek(weekStart);
  }, [weekStart]);

  async function onSave() {
    setMsg({ type: "", text: "" });
    if (!initiativeId || !personId || !weekStart || !hours || hours <= 0) {
      setMsg({ type: "error", text: "Please select initiative, person, week and enter hours > 0." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await upsertAllocation({
        initiative_id: initiativeId as number,
        person_id: personId as number,
        week_start: weekStart,
        hours: Number(hours),
      });
      if (!res.ok) {
        setMsg({ type: "error", text: res.error });
        return;
      }
      setMsg({ type: "success", text: "Allocation saved." });
      setHours(0);
      await loadWeek(weekStart);
    } catch (err) {
      setMsg({ type: "error", text: messageFromUnknown(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: number) {
    const res = await deleteAllocation(id);
    if (!res.ok) {
      setMsg({ type: "error", text: res.error });
      return;
    }
    await loadWeek(weekStart);
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Allocations</Typography>

      {/* Auto Allocate trigger */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          onClick={() => {
            if (!canAutoAlloc) return;
            setAutoAllocOpen(true);
          }}
          disabled={!canAutoAlloc}
        >
          Auto Allocate
        </Button>
      </Box>

      {/* Manual Allocation Form */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", flexDirection: "row", gap: 2, flexWrap: "wrap" }}>
            <TextField
              select
              label="Initiative"
              value={initiativeId ?? ""}
              onChange={(e) =>
                setInitiativeId(e.target.value === "" ? null : Number(e.target.value))
              }
              sx={{ minWidth: 260, flex: "1 1 260px" }}
            >
              <MenuItem value="" disabled>Select an initiative…</MenuItem>
              {initiatives.map((i) => (
                <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Person"
              value={personId}
              onChange={(e) => setPersonId(Number(e.target.value))}
              sx={{ minWidth: 260, flex: "1 1 260px" }}
            >
              {people.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.full_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="date"
              label="Week (Monday)"
              InputLabelProps={{ shrink: true }}
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              sx={{ minWidth: 180 }}
            />

            <TextField
              type="number"
              label="Hours"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              inputProps={{ min: 1 }}
              sx={{ minWidth: 120 }}
            />

            <Button onClick={onSave} variant="contained" disabled={submitting || loading}>
              {submitting ? "Saving…" : "Save Allocation"}
            </Button>
          </Box>

          {msg.type && <Alert severity={msg.type}>{msg.text}</Alert>}
        </Stack>
      </Paper>

      {/* Week list */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Allocations for {weekStart}
          </Typography>
          <Chip label={rows.length} size="small" />
        </Stack>

        {rows.length === 0 ? (
          <Alert severity="info">No allocations for this week yet.</Alert>
        ) : (
          <List dense disablePadding>
            {rows.map((a) => (
              <ListItem
                key={a.id}
                divider
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => onDelete(a.id)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 600 }}
                  primary={`${personNameById.get(a.person_id) ?? "Person"} → ${
                    initiativeNameById.get(a.initiative_id) ?? "Initiative"
                  }`}
                  secondary={`${a.hours} hrs • Week: ${a.week_start}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Auto-Allocate Preview Modal */}
      {autoAllocOpen && canAutoAlloc && (
        <AutoAllocPreviewModal
          open={autoAllocOpen}
          initiativeId={initiativeId!}
          onClose={() => setAutoAllocOpen(false)}
        />
      )}
    </Container>
  );
}