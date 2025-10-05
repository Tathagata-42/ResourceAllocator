import { useEffect, useState } from "react";
import { Container, Paper, Stack, Typography, Chip } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (mounted && user) {
        setEmail(user.email ?? "");
        // try to load display name from profiles (optional)
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (mounted && profile?.full_name) setName(profile.full_name);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Container sx={{ mt: 4 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <HomeOutlinedIcon fontSize="small" />
          <Typography variant="h5" fontWeight={700}>
            Resource Allocator
          </Typography>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
          <VerifiedUserIcon color="primary" />
          <Stack>
            <Typography variant="subtitle1" fontWeight={700}>
              Welcome{ name ? `, ${name}` : "" }!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Signed in as <Chip size="small" label={email || "—"} />
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}