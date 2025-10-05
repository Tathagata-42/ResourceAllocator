import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  CircularProgress,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

import { listPeople } from "../services/people";
import type { Person } from "../services/people";

import { listRoles } from "../services/roles";
import type { Role as RoleRow } from "../services/roles";
import { Stack, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddPersonDialog from "../components/AddpersonDialog";
import { createPerson, type NewPerson } from "../services/people";
import {  IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import EditPersonDialog from "../components/EditPersonDialog";
import { updatePerson } from "../services/people";

// Back-compat: support legacy 'role' alongside new 'role_code'
type PersonWithLegacy = Person & { role?: string; role_code?: string };

export default function PeoplePage() {
  const [rows, setRows] = useState<PersonWithLegacy[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PersonWithLegacy | null>(null);

const [banner, setBanner] = useState<{type:""|"success"|"error"; text:string}>({type:"", text:""});

async function handleCreate(p: NewPerson) {
  setBanner({ type: "", text: "" });
  const res = await createPerson(p);
  if (res.ok) {
    setBanner({ type: "success", text: `Added ${res.data.full_name}.` });
    // refresh list
    const pRes = await listPeople();
    if (pRes.ok) setRows(pRes.data as PersonWithLegacy[]);
  } else {
    setBanner({ type: "error", text: res.error });
  }
}

  // Map role code -> display name
  const rolesByCode = useMemo(() => {
    const map = new Map<string, string>();
    roles.forEach((r) => map.set(r.code, r.name));
    return map;
  }, [roles]);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, rRes] = await Promise.all([listPeople(), listRoles()]);
        if (pRes.ok) setRows(pRes.data as PersonWithLegacy[]);
        else setError(pRes.error);

        if (rRes.ok) setRoles(rRes.data);
        else if (!error) setError(rRes.error);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRoleName = (person: PersonWithLegacy): string => {
    const code = person.role_code ?? person.role ?? "";
    return code ? rolesByCode.get(code) ?? code : "—";
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
  <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
    People
  </Typography>
  <Button startIcon={<AddIcon />} variant="contained" onClick={() => setAdding(true)}>
    Add Person
  </Button>
</Stack>

{banner.type && <Alert severity={banner.type} sx={{ mb: 2 }}>{banner.text}</Alert>}

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Weekly Capacity (hrs)</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.full_name}</TableCell>
                <TableCell>{getRoleName(p)}</TableCell>
                <TableCell align="right">
                  {typeof p.weekly_capacity_hours === "number" ? p.weekly_capacity_hours : "—"}
                </TableCell>
                <TableCell align="center">{p.active ? "✓" : "—"}</TableCell>
                <TableCell align="right">
    <IconButton aria-label="edit" onClick={() => setEditing(p)}>
      <EditIcon fontSize="small" />
    </IconButton>
  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <AddPersonDialog
  open={adding}
  onClose={() => setAdding(false)}
  onSubmit={handleCreate}
/>
{banner.type && <Alert severity={banner.type} sx={{ mt: 2 }}>{banner.text}</Alert>}

<EditPersonDialog
  open={Boolean(editing)}
  person={editing as never}
  onClose={() => setEditing(null)}
  onSave={async (patch) => {
    setBanner({ type: "", text: "" });
    const res = await updatePerson(patch);
    if (res.ok) {
      setBanner({ type: "success", text: "Person updated." });
      // Refresh list after update
      const pRes = await listPeople();
      if (pRes.ok) setRows(pRes.data as typeof rows);
    } else {
      setBanner({ type: "error", text: res.error });
    }
  }}
  allowRoleChange={true}
/>
    </Container>
  );
}