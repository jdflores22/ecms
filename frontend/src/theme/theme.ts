import { createTheme } from '@mui/material/styles'
import { appColors } from './colors'
import { portalColors } from './portalTheme'

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: portalColors.primary, dark: portalColors.primaryDark, contrastText: '#ffffff' },
    secondary: { main: portalColors.accent },
    background: {
      default: portalColors.bgPage,
      paper: portalColors.bgWhite,
    },
    text: {
      primary: portalColors.textDark,
      secondary: portalColors.textMuted,
      disabled: portalColors.textLight,
    },
    divider: portalColors.border,
    error: {
      main: '#d32f2f',
      light: appColors.errorBg,
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: portalColors.bgPage,
          color: portalColors.textDark,
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(11, 61, 145, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&.MuiButton-containedPrimary:hover': {
            backgroundColor: portalColors.primaryDark,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '0.625rem',
          '& fieldset': { borderColor: portalColors.borderStrong },
          '&.Mui-focused fieldset': {
            borderColor: portalColors.primary,
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px rgba(11, 61, 145, 0.12)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: portalColors.textDark,
          backgroundColor: portalColors.bgMuted,
          borderBottom: `1px solid ${portalColors.border}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          position: 'relative',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
        },
      },
    },
  },
})
