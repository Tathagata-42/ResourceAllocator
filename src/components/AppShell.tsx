import type { PropsWithChildren } from "react";
import {
  AppBar,
  Box,
  Container,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import { Link, useLocation } from "react-router-dom";

const routes = [
  { label: "Home", path: "/", icon: <HomeOutlinedIcon fontSize="small" /> },
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon fontSize="small" /> },
  { label: "People", path: "/people", icon: <PeopleIcon fontSize="small" /> },
  { label: "Initiatives", path: "/initiatives", icon: <WorkspacesIcon fontSize="small" /> },
  { label: "Allocations", path: "/allocations", icon: <PlaylistAddCheckIcon fontSize="small" /> },
  { label: "Daily Allocations", path: "/daily-allocations", icon: <WorkspacesIcon fontSize="small" /> },
  { label: "Huddle", path: "/huddle", icon: <PlaylistAddCheckIcon fontSize="small" /> },
  { label: "Availablity Page", path: "/availability", icon: <PlaylistAddCheckIcon fontSize="small" /> },
  
];

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const idx = routes.findIndex((r) =>
    r.path === "/" ? location.pathname === "/" : location.pathname.startsWith(r.path)
  );
  const value = idx === -1 ? 0 : idx;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}
          >
            Resource Allocator
          </Typography>
          <Box sx={{ flex: 1 }} />
        </Toolbar>

        <Tabs
          value={value}
          variant="scrollable"
          scrollButtons="auto"
          TabIndicatorProps={{ style: { display: "none" } }} // hide underline
          sx={{ px: 2 }}
        >
          {routes.map((r) => (
            <Tab
              key={r.path}
              icon={r.icon}
              iconPosition="start"
              label={r.label}
              component={Link}
              to={r.path}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                px: 2,
                minHeight: 40,
                color: "text.primary",
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "white !important",
                  "& .MuiSvgIcon-root": {
                    color: "white !important",
                  },
                },
               
              }}
            />
          ))}
        </Tabs>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}