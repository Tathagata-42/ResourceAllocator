import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { listRoles } from "../services/roles";
import type { Role as RoleRow } from "../services/roles";
import type { NewPerson } from "../services/people";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: NewPerson) => Promise<void>;
};

export default function AddPersonDialog({ open, onClose, onSubmit }: Props) {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [roleCode, setRoleCode] = useState<string>("");
  const [dailyCapacity, setDailyCapacity] = useState<number>(6.5);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const r = await listRoles();
      if (r.ok) {
        setRoles(r.data);
        if (!roleCode && r.data.length > 0) setRoleCode(r.data[0].code);
      }
    })();
  }, [open, roleCode]);

  const canSave =
    fullName.trim().length >= 2 &&
    roleCode.trim().length > 0 &&
    dailyCapacity >= 0 &&
    dailyCapacity <= 24;

  async function handleSave() {
    if (!canSave) return;
    await onSubmit({
      full_name: fullName.trim(),
      role_code: roleCode,
      daily_capacity: Number(dailyCapacity),
      email: email.trim() ? email.trim() : undefined,
    });
    // reset for next time
    setFullName("");
    setEmail("");
    setDailyCapacity(6.5);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Person</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
            required
          />
          <TextField
            select
            label="Role"
            value={roleCode}
            onChange={(e) => setRoleCode(e.target.value)}
            required
          >
            {roles.map((r) => (
              <MenuItem key={r.code} value={r.code}>
                {r.name} ({r.code})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Daily capacity (hours)"
            type="number"
            inputProps={{ min: 0, max: 24, step: 0.5 }}
            value={dailyCapacity}
            onChange={(e) => setDailyCapacity(Number(e.target.value))}
            helperText="Typical cap is 6.5 h/day"
          />
          <TextField
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSave} onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}