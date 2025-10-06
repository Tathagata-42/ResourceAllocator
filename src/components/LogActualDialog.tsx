// client/src/components/LogActualDialog.tsx
import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { logActualAndAdjust, type AdjustmentRow } from "../services/rollForward";
import { messageFromUnknown } from "../lib/safeSupabase";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (rows: AdjustmentRow[]) => void;
  initiativeId: number;
  personId: number;
  date: string;       // YYYY-MM-DD
  planned: number;    // planned hours for that day for this initiative/person
  personName?: string;
  initiativeName?: string;
};

export default function LogActualDialog({
  open,
  onClose,
  onSuccess,
  initiativeId,
  personId,
  date,
  planned,
  personName,
  initiativeName,
}: Props) {
  const [actual, setActual] = useState<number>(planned);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });

  const overrun = useMemo(() => Math.max(0, (Number(actual) || 0) - (Number(planned) || 0)), [actual, planned]);

  async function handleApply() {
    setMsg({ type: "", text: "" });
    setSaving(true);
    try {
      const res = await logActualAndAdjust({
        initiativeId,
        personId,
        day: date,
        actual: Number(actual || 0),
      });
      if (res.ok) {
        onSuccess(res.data);
        onClose();
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Log actual & roll forward</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {(personName || initiativeName) && (
            <Typography variant="body2" color="text.secondary">
              {personName ? <b>{personName}</b> : null}
              {personName && initiativeName ? " • " : null}
              {initiativeName ? <span>Initiative: <b>{initiativeName}</b></span> : null}
              {" • "}Date: <b>{date}</b>
            </Typography>
          )}

          <TextField
            label="Planned hours (read-only)"
            value={planned}
            InputProps={{ readOnly: true }}
          />

          <TextField
            autoFocus
            type="number"
            label="Actual hours"
            inputProps={{ min: 0, step: 0.5 }}
            value={actual}
            onChange={(e) => setActual(Number(e.target.value))}
            helperText={overrun > 0 ? `Overrun: ${overrun.toFixed(1)}h (will subtract from future days)` : "No overrun"}
          />

          {msg.type && <Alert severity={msg.type}>{msg.text}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleApply} variant="contained" disabled={saving || actual < 0}>
          {saving ? "Applying…" : "Log & Adjust"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}