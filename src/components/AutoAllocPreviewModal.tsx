// src/components/AutoAllocPreviewModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { listPeople } from "../services/people";
import type { Person } from "../services/people";

import {
  getRoleDemand,
  listInitiativeTeam,
  type RoleCode,
  type RoleDemandRow,
} from "../services/initiatives";

import {
  previewAllocations,
  applyAllocations,
  type PreviewAllocation,
} from "../services/autoAlloc";

import { messageFromUnknown } from "../lib/safeSupabase";

type Props = {
  open: boolean;
  initiativeId: number;
  onClose: () => void;
};

// Allow legacy shape (some places might still return `role`)
type PersonWithRoleMaybe = Person & { role_code?: string | null; role?: string | null };

type PersonLite = {
  id: number;
  full_name: string;
  role_code: RoleCode | "UNKNOWN" | null;
};

const ROLE_ORDER: RoleCode[] = ["PM", "SA", "BA", "DESIGNER", "DEVELOPER", "TESTER"];

function normalizeRoleCode(raw: string | null | undefined): RoleCode | "UNKNOWN" {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "DEV") return "DEVELOPER";
  if (v === "BUSINESS_ANALYST") return "BA";
  if (["PM", "SA", "BA", "DESIGNER", "DEVELOPER", "TESTER"].includes(v)) {
    return v as RoleCode;
  }
  return "UNKNOWN";
}

export default function AutoAllocPreviewModal({ open, initiativeId, onClose }: Props) {
  // Base data
  const [allPeople, setAllPeople] = useState<PersonLite[]>([]);
  const [roleDemand, setRoleDemand] = useState<RoleDemandRow[]>([]);
  const [selected, setSelected] = useState<number[]>([]); // selected team members

  // Preview
  const [preview, setPreview] = useState<PreviewAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  // Load base: people (id, name, role), demand, team
  useEffect(() => {
    if (!open) return;
    (async () => {
      setMsg({ type: "", text: "" });
      setLoading(true);
      try {
        const [pRes, dRes, tRes] = await Promise.all([
          listPeople(),                 // ensure your service selects role_code if present
          getRoleDemand(initiativeId),
          listInitiativeTeam(initiativeId), // reads from initiative_people
        ]);

        if (pRes.ok) {
          const people = pRes.data.map((p: PersonWithRoleMaybe): PersonLite => ({
            id: p.id,
            full_name: p.full_name,
            role_code: normalizeRoleCode(p.role_code ?? p.role),
          }));
          setAllPeople(people);
        } else {
          setMsg({ type: "error", text: pRes.error });
        }

        if (dRes.ok) setRoleDemand(dRes.data);
        else if (!msg.type) setMsg({ type: "error", text: dRes.error });

        if (tRes.ok) {
          const ids = tRes.data.map((t) => t.person_id);
          setSelected(ids); // default select current team
        } else if (!msg.type) {
          setMsg({ type: "error", text: tRes.error });
        }
      } catch (err) {
        setMsg({ type: "error", text: messageFromUnknown(err) });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initiativeId]);

  // Group people by role
  const byRole = useMemo(() => {
    const m = new Map<RoleCode | "UNKNOWN", PersonLite[]>();
    for (const p of allPeople) {
      const key = (p.role_code ?? "UNKNOWN") as RoleCode | "UNKNOWN";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.full_name.localeCompare(b.full_name));
    return m;
  }, [allPeople]);

  // Planned hours lookup
  const plannedByRole = useMemo(() => {
    const m = new Map<RoleCode, number>();
    roleDemand.forEach((r) => m.set(r.role, Number(r.planned_hours) || 0));
    return m;
  }, [roleDemand]);

  // Preview whenever selection changes
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const sel = selected.length ? selected : undefined;
        const res = await previewAllocations(initiativeId, sel);
        if (res.ok) setPreview(res.data);
        else setMsg({ type: "error", text: res.error });
      } catch (err) {
        setMsg({ type: "error", text: messageFromUnknown(err) });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, initiativeId, selected]);

  // Derived sums (planned vs preview)
  const previewHoursByRole = useMemo(() => {
    const idx = new Map<number, PersonLite>();
    allPeople.forEach((p) => idx.set(p.id, p));

    const m = new Map<RoleCode | "UNKNOWN", number>();
    preview.forEach((r) => {
      const role = (idx.get(r.person_id)?.role_code ?? "UNKNOWN") as RoleCode | "UNKNOWN";
      m.set(role, (m.get(role) ?? 0) + Number(r.hours || 0));
    });
    return m;
  }, [preview, allPeople]);

  function togglePerson(id: number) {
    setSelected((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  }

  async function apply(overwrite: boolean) {
    setApplying(true);
    setMsg({ type: "", text: "" });
    try {
      const sel = selected.length ? selected : undefined;
      const res = await applyAllocations(initiativeId, sel, overwrite);
      if (res.ok) {
        const inserted = res.data.filter((r) => r.out_action === "inserted").length;
        const updated = res.data.filter((r) => r.out_action === "updated").length;
        const skipped = res.data.filter((r) => r.out_action === "skipped").length;
        setMsg({
          type: "success",
          text: `Applied ${res.data.length} rows — inserted ${inserted}, updated ${updated}, skipped ${skipped}.`,
        });

        // Optional: refresh preview after apply
        const prev = await previewAllocations(initiativeId, sel);
        if (prev.ok) setPreview(prev.data);
      } else {
        setMsg({ type: "error", text: res.error });
      }
    } catch (err) {
      setMsg({ type: "error", text: messageFromUnknown(err) });
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Auto Allocation Preview</DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress />}

        {/* Planned vs preview summary */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Planned hours per role</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {ROLE_ORDER.map((rc) => {
              const planned = plannedByRole.get(rc) ?? 0;
              const previewH = previewHoursByRole.get(rc) ?? 0;
              const met = planned > 0 && previewH >= planned;
              return (
                <Chip
                  key={rc}
                  label={`${rc}: planned ${planned}h • preview ${previewH.toFixed(1)}h`}
                  variant={met ? "filled" : "outlined"}
                  color={met ? "success" : "default"}
                  sx={{ mr: 1, mb: 1 }}
                />
              );
            })}
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* People grouped by role with checkboxes */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Select team members to consider
        </Typography>
        {ROLE_ORDER.map((rc) => {
          const people = byRole.get(rc) ?? [];
          if (people.length === 0 && (plannedByRole.get(rc) ?? 0) === 0) return null;
          return (
            <Accordion key={rc} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontWeight: 700, mr: 1 }}>{rc}</Typography>
                  <Chip
                    size="small"
                    label={`planned ${plannedByRole.get(rc) ?? 0}h • selected ${
                      people.filter((p) => selected.includes(p.id)).length
                    }`}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={0.5}>
                  {people.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No people with this role.</Typography>
                  ) : (
                    people.map((p) => (
                      <FormControlLabel
                        key={p.id}
                        control={
                          <Checkbox
                            checked={selected.includes(p.id)}
                            onChange={() => togglePerson(p.id)}
                          />
                        }
                        label={p.full_name}
                      />
                    ))
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}

        {/* Fallback when preview is empty */}
        {!loading && preview.length === 0 && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: "action.hover" }}>
            <Typography variant="body2">
              No suggested rows for this initiative / selection. Try choosing different people or check
              role demand and date windows.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ ml: 1 }}>
          {msg.type && msg.text}
        </Typography>
        <Box>
          <Button onClick={onClose}>Close</Button>
          <Button onClick={() => apply(false)} variant="contained" disabled={applying}>
            Apply (Fill Only)
          </Button>
          <Button onClick={() => apply(true)} variant="contained" color="secondary" disabled={applying} sx={{ ml: 1 }}>
            Apply (Overwrite)
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}