import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import type { Person } from "../services/people";
import { listRoles } from "../services/roles";
import type { Role as RoleRow } from "../services/roles";

type Props = {
  open: boolean;
  person: Person | null;
  onClose: () => void;
  onSave: (patch: {
    id: number;
    role_code?: string;
    daily_capacity?: number | null;
    weekly_capacity_hours?: number | null;
    active?: boolean;
  }) => Promise<void>;
  allowRoleChange?: boolean; // default true
};
// Helper to safely extract role_code or role for legacy data
function getRoleCode(p: Person | null): string {
    if (!p) return "";

    const role = (p as { role_code?: string; role?: string }).role_code ?? (p as { role?: string }).role;
    return typeof role === "string" ? role : "";
  }
export default function EditPersonDialog({ open, person, onClose, onSave, allowRoleChange = true }: Props) {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [roleCode, setRoleCode] = useState<string>("");
  const [dailyCap, setDailyCap] = useState<number | "">("");
  const [weeklyCap, setWeeklyCap] = useState<number | "">("");
  const [active, setActive] = useState<boolean>(true);

  const canSave = useMemo(() => {
    const dcOk = dailyCap === "" || (typeof dailyCap === "number" && dailyCap >= 0 && dailyCap <= 24);
    const wcOk = weeklyCap === "" || (typeof weeklyCap === "number" && weeklyCap >= 0 && weeklyCap <= 80);
    return !!person?.id && dcOk && wcOk;
  }, [person, dailyCap, weeklyCap]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const r = await listRoles();
      if (r.ok) setRoles(r.data);
    })();
  }, [open]);

  useEffect(() => {
    if (!open || !person) return;
    setRoleCode(getRoleCode(person));
    setDailyCap(typeof person.daily_capacity === "number" ? person.daily_capacity : "");
    setWeeklyCap(typeof person.weekly_capacity_hours === "number" ? person.weekly_capacity_hours : "");
    setActive(Boolean(person.active));
  }, [open, person]);

  async function handleSave() {
    if (!person?.id || !canSave) return;
    await onSave({
      id: person.id,
      role_code: allowRoleChange ? (roleCode || undefined) : undefined,
      daily_capacity: dailyCap === "" ? null : Number(dailyCap),
      weekly_capacity_hours: weeklyCap === "" ? null : Number(weeklyCap),
      active,
    });
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Person</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Name" value={person?.full_name ?? ""} InputProps={{ readOnly: true }} />
          {allowRoleChange && (
            <TextField
              select
              label="Role"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
            >
              {roles.map((r) => (
                <MenuItem key={r.code} value={r.code}>
                  {r.name} ({r.code})
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="Daily capacity (hours)"
            type="number"
            inputProps={{ min: 0, max: 24, step: 0.5 }}
            value={dailyCap}
            onChange={(e) => setDailyCap(e.target.value === "" ? "" : Number(e.target.value))}
            helperText="Leave blank to use default (e.g., 6.5)"
          />
          <TextField
            label="Weekly capacity (hours)"
            type="number"
            inputProps={{ min: 0, max: 80, step: 0.5 }}
            value={weeklyCap}
            onChange={(e) => setWeeklyCap(e.target.value === "" ? "" : Number(e.target.value))}
            helperText="Optional; used for weekly guardrails"
          />
          <FormControlLabel
            control={<Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} />}
            label="Active"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSave} onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}