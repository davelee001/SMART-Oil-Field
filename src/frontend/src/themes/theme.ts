import { createTheme, ThemeOptions } from '@mui/material/styles';

const typography: ThemeOptions['typography'] = {
    fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
    h1: {
        fontSize: '2.5rem',
        fontWeight: 750,
        letterSpacing: '-0.025em',
        marginBottom: '1rem',
    },
    h2: {
        fontSize: '2rem',
        fontWeight: 750,
        letterSpacing: '-0.02em',
        marginBottom: '0.75rem',
    },
    h3: {
        fontSize: '1.5rem',
        fontWeight: 700,
        letterSpacing: '-0.015em',
        marginBottom: '0.5rem',
    },
    h4: {
        fontWeight: 750,
        letterSpacing: '-0.02em',
    },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
    },
    button: {
        fontWeight: 700,
        letterSpacing: '0.01em',
    },
};

const components: ThemeOptions['components'] = {
    MuiCssBaseline: {
        styleOverrides: {
            body: {
                scrollbarColor: '#8595a6 transparent',
            },
        },
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                backgroundImage: 'none',
                boxShadow: '0 2px 10px rgba(15, 39, 64, 0.18)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            },
        },
    },
    MuiDrawer: {
        styleOverrides: {
            paper: ({ theme }) => ({
                borderRight: '1px solid',
                borderColor: theme.palette.divider,
                boxShadow: '4px 0 16px rgba(15, 39, 64, 0.04)',
            }),
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                backgroundImage: 'none',
            },
            elevation1: {
                boxShadow: '0 3px 12px rgba(15, 39, 64, 0.08)',
            },
        },
    },
    MuiCard: {
        styleOverrides: {
            root: ({ theme }) => ({
                border: '1px solid',
                borderColor: theme.palette.divider,
                boxShadow: '0 3px 12px rgba(15, 39, 64, 0.07)',
                transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(15, 39, 64, 0.11)',
                },
            }),
        },
    },
    MuiButton: {
        defaultProps: {
            disableElevation: true,
        },
        styleOverrides: {
            root: {
                borderRadius: 6,
                textTransform: 'none',
                fontSize: '0.925rem',
                padding: '9px 18px',
            },
            contained: {
                boxShadow: '0 2px 5px rgba(15, 39, 64, 0.16)',
                '&:hover': {
                    boxShadow: '0 4px 10px rgba(15, 39, 64, 0.22)',
                },
            },
        },
    },
    MuiChip: {
        styleOverrides: {
            root: {
                borderRadius: 5,
                fontWeight: 650,
            },
        },
    },
    MuiAccordion: {
        styleOverrides: {
            root: {
                borderRadius: '6px !important',
                boxShadow: 'none',
                '&:before': { display: 'none' },
            },
        },
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: {
                borderRadius: 6,
            },
        },
    },
    MuiListItemButton: {
        styleOverrides: {
            root: {
                borderRadius: 6,
                margin: '2px 8px',
            },
        },
    },
};

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#173F5F',
            light: '#356B8F',
            dark: '#0F2942',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#147D82',
            light: '#45A3A6',
            dark: '#0C5A5E',
            contrastText: '#ffffff',
        },
        background: {
            default: '#F3F6F8',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#172B3A',
            secondary: '#5B6B78',
        },
        divider: '#D8E1E8',
        success: { main: '#2D7D5C' },
        error: { main: '#C5414B' },
        warning: { main: '#B7791F' },
        info: { main: '#2676A5' },
    },
    typography,
    shape: { borderRadius: 6 },
    components,
});

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#70A7CC',
            light: '#9AC5E1',
            dark: '#3C7399',
            contrastText: '#0B1D2B',
        },
        secondary: {
            main: '#55B5B8',
            light: '#83CFD1',
            dark: '#287F83',
            contrastText: '#071C1D',
        },
        background: {
            default: '#0D1821',
            paper: '#142531',
        },
        text: {
            primary: '#EEF4F7',
            secondary: '#AABAC5',
        },
        divider: '#2B414F',
        success: { main: '#58A77F' },
        error: { main: '#E07178' },
        warning: { main: '#D5A44D' },
        info: { main: '#63A9D1' },
    },
    typography,
    shape: { borderRadius: 6 },
    components,
});
