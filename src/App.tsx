import { useEffect, useState } from "react";
import { Alert, Button, Stack } from "@mui/material";
import { Routes, Route, Navigate } from "react-router-dom";

import { supabase } from "./lib/supabaseClient";
import { signInPM } from "./lib/auth";
import { messageFromUnknown } from "./lib/safeSupabase";

import { AppShell } from "./components/AppShell";
import DashboardPage from "./pages/Dashboard";
import PeoplePage from "./pages/People";
import HomePage from "./pages/Home";
import InitiativesPage from "./pages/initiatives"; // ensure the filename is Initiatives.tsx
import AllocationsPage from "./pages/Allocations";
import DailyAllocationsPage from "./pages/DailyAllocations";
import HuddlePage from "./pages/Huddle";
import AvailabilityPage from "./pages/AvailabilityPage";
export default function App() {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function doSignIn() {
    try {
      setStatus("idle");
      setMsg("Signing in…");
      const user = await signInPM();
      setStatus("ok");
      setMsg(`Signed in as ${user?.email ?? "PM"}`);
    } catch (err) {
      setStatus("error");
      setMsg(messageFromUnknown(err));
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus("ok");
        setMsg(`Session OK for ${data.session.user.email}`);
      } else {
        doSignIn();
      }
    });
  }, []);

  if (status !== "ok") {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Alert severity={status === "error" ? "error" : "info"}>
          {msg || "Initializing…"}
        </Alert>
        <Button variant="contained" onClick={doSignIn}>
          Sign in (PM)
        </Button>
      </Stack>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/initiatives" element={<InitiativesPage />} />
        <Route path="/allocations" element={<AllocationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/daily-allocations" element={<DailyAllocationsPage />} />
        <Route path="/huddle" element={<HuddlePage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
      </Routes>
    </AppShell>
  );
}