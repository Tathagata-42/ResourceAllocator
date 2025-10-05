import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AssessmentIcon from "@mui/icons-material/Assessment";
import InputAdornment from "@mui/material/InputAdornment";

import {
  createInitiative,
  listInitiatives,
  upsertRoleDemand,
  type Initiative,
  type Methodology,
} from "../services/initiatives";

import { listPeople } from "../services/people";
import type { Person } from "../services/people";

import { setInitiativePeople } from "../services/initiativePeople";
import { messageFromUnknown } from "../lib/safeSupabase";

// Fixed roles for demand entry (includes DEVELOPER)
const ROLES = ["BA", "SA", "PM", "TESTER", "DESIGNER", "DEVELOPER"] as const;
type Role = (typeof ROLES)[number];

export default function InitiativesPage() {
  // Data
  const [items, setItems] = useState<Initiative[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [methodology, setMethodology] = useState<Methodology>("AGILE");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [demand, setDemand] = useState<Record<Role, number>>({
    BA: 0,
    SA: 0,
    PM: 0,
    TESTER: 0,
    DESIGNER: 0,
    DEVELOPER: 0,
  });
  // Team for this initiative (whitelisted people for auto-allocation)
  const [teamIds, setTeamIds] = useState<number[]>([]);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | ""; text: string }>({
    type: "",
    text: "",
  });

  async function refresh() {
    const [iRes, pRes] = await Promise.all([listInitiatives(), listPeople()]);
    if (iRes.ok) setItems(iRes.data);
    if (pRes.ok) setPeople(pRes.data);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function resetForm() {
    setName("");
    setMethodology("AGILE");
    setStart("");
    setEnd("");
    setDemand({
      BA: 0,
      SA: 0,
      PM: 0,
      TESTER: 0,
      DESIGNER: 0,
      DEVELOPER: 0,
    });
    setTeamIds([]);
  }

  async function onCreate() {
    setMsg({ type: "", text: "" });

    // Minimal validation
    if (!name || !start || !end) {
      setMsg({ type: "error", text: "Please fill Name, Start and End dates." });
      return;
    }
    if (new Date(start) > new Date(end)) {
      setMsg({ type: "error", text: "Start date must be before End date." });
      return;
    }

    setSubmitting(true);
    try {
      // 1) Create initiative
      const created = await createInitiative({
        name,
        methodology,
        start_date: start,
        end_date: end,
      });
      if (!created.ok) {
        setMsg({ type: "error", text: created.error });
        setSubmitting(false);
        return;
      }

      // 2) Upsert role demand
      const rows = ROLES.map((r) => ({
        role: r, // matches initiative_role_demand.role
        planned_hours: Number(demand[r] ?? 0),
      }));
      const up = await upsertRoleDemand(created.data.id, rows);
      if (!up.ok) {
        setMsg({ type: "error", text: up.error });
        setSubmitting(false);
        return;
      }

      // 3) Save team (optional)
      if (teamIds.length) {
        const teamRes = await setInitiativePeople(created.data.id, teamIds);
        if (!teamRes.ok) {
          setMsg({ type: "error", text: `Team save failed: ${teamRes.error}` });
          setSubmitting(false);
          return;
        }
      }

      setMsg({ type: "success", text: "Initiative created with role demand and team." });
      resetForm();
      await refresh();
    } catch (err) {
      setMsg({ type: "error", text: messageFromUnknown(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AssessmentIcon fontSize="small" />
          <Typography variant="h5" fontWeight={700}>
            Initiatives
          </Typography>
        </Stack>
      </Stack>

      {/* Create Card */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          background: "linear-gradient(180deg, #fff, #fafafa)",
        }}
      >
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Create new initiative
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth
              label="Name"
              placeholder="e.g., Customer Onboarding Portal"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <TextField
              select
              label="Methodology"
              value={methodology}
              onChange={(e) => setMethodology(e.target.value as Methodology)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="AGILE">Agile</MenuItem>
              <MenuItem value="WATERFALL">Waterfall</MenuItem>
              <MenuItem value="HYBRID">Hybrid</MenuItem>
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth
              type="date"
              label="Start"
              InputLabelProps={{ shrink: true }}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarMonthIcon sx={{ color: "action.active" }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              type="date"
              label="End"
              InputLabelProps={{ shrink: true }}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarMonthIcon sx={{ color: "action.active" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          <Divider sx={{ my: 1 }} />

          <Typography variant="subtitle2" color="text.secondary">
            Planned hours by role
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {ROLES.map((r) => (
              <TextField
                key={r}
                type="number"
                label={`${r} hours`}
                value={demand[r]}
                onChange={(e) =>
                  setDemand((s) => ({ ...s, [r]: Number(e.target.value) }))
                }
                sx={{ flex: "1 1 140px", minWidth: 140 }}
                inputProps={{ min: 0 }}
              />
            ))}
          </Box>

          <Divider sx={{ my: 1 }} />

          <Typography variant="subtitle2" color="text.secondary">
            Team (people who can be auto-allocated)
          </Typography>
          <TextField
            select
            label="Select team members"
            SelectProps={{ multiple: true }}
            value={teamIds}
            onChange={(e) => {
                const vals = e.target.value as unknown as (number | string)[];
                setTeamIds(vals.map((v) => Number(v)));
              }}
            sx={{ minWidth: 320 }}
          >
            {people.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.full_name}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={2}>
            <Button
              onClick={onCreate}
              variant="contained"
              startIcon={<AddIcon />}
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create Initiative"}
            </Button>
            {msg.type && (
              <Alert severity={msg.type} sx={{ flex: 1 }}>
                {msg.text}
              </Alert>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Existing list */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Existing initiatives
          </Typography>
          <Chip
            label={`${items.length}`}
            size="small"
            sx={{ fontWeight: 700 }}
            color="primary"
            variant="outlined"
          />
        </Stack>

        {items.length === 0 ? (
          <Alert severity="info">No initiatives yet. Create your first one above.</Alert>
        ) : (
          <List dense disablePadding>
            {items.map((i) => (
              <ListItem
                key={i.id}
                divider
                secondaryAction={
                  <Chip
                    label={i.methodology}
                    size="small"
                    color="default"
                    sx={{ fontWeight: 600 }}
                  />
                }
              >
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 600 }}
                  primary={i.name}
                  secondary={`${i.start_date} → ${i.end_date}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}