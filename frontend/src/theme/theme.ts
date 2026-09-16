import { createTheme } from '@mui/material/styles'
import { appColors } from './colors'

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: appColors.primary, dark: appColors.primaryDark },
    secondary: { main: appColors.accent },
    background: {
      default: appColors.pageBg,
      paper: appColors.white,
    },
    text: {
      primary: appColors.textDark,
      secondary: appColors.textMuted,
      disabled: appColors.textLight,
    },
    divider: appColors.border,
    error: {
      main: '#d32f2f',
      light: appColors.errorBg,
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: appColors.pageBg,
          color: appColors.textDark,
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
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.625rem',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&.MuiButton-containedPrimary:hover': {
            backgroundColor: appColors.primaryDark,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '0.625rem',
          '& fieldset': { borderColor: appColors.border },
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
          color: appColors.textMuted,
          backgroundColor: appColors.brandBg,
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
