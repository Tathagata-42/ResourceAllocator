import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0B5FFF" },    // crisp blue
    secondary: { main: "#111827" },  // near-black for accents
    background: { default: "#F7F8FA", paper: "#FFFFFF" },
    text: { primary: "#0F172A", secondary: "#475569" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: [
      "-apple-system","BlinkMacSystemFont","Segoe UI","Roboto","Inter","Helvetica","Arial","sans-serif"
    ].join(","),
    h5: { fontWeight: 700, letterSpacing: "-0.02em" },
    body2: { color: "#475569" }
  },
  components: {
    MuiPaper: { styleOverrides: { root: { boxShadow: "0 6px 18px rgba(0,0,0,0.06)" } } },
    MuiButton: { defaultProps: { variant: "contained" } },
    MuiContainer: { defaultProps: { maxWidth: "lg" } },
  },
});