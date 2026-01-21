import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1e3c72',
            light: '#4a6ba0',
            dark: '#152a4e',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#2a5298',
            light: '#5674b8',
            dark: '#1c3969',
            contrastText: '#ffffff',
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff',
        },
        text: {
            primary: '#1e3c72',
            secondary: '#666666',
        },
        success: {
            main: '#28a745',
        },
        error: {
            main: '#dc3545',
        },
        warning: {
            main: '#ffc107',
        },
    },
    typography: {
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 600,
            marginBottom: '1rem',
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
        },
        h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.6,
        },
    },
    shape: {
        borderRadius: 15,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-5px)',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 25,
                    textTransform: 'none',
                    fontSize: '1rem',
                    padding: '10px 20px',
                },
            },
        },
    },
});

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#4a6ba0',
            light: '#7291c7',
            dark: '#2e4470',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#5674b8',
            light: '#839bd3',
            dark: '#3a4f7f',
            contrastText: '#ffffff',
        },
        background: {
            default: '#121212',
            paper: '#1e1e1e',
        },
        text: {
            primary: '#ffffff',
            secondary: '#b3b3b3',
        },
        success: {
            main: '#4caf50',
        },
        error: {
            main: '#f44336',
        },
        warning: {
            main: '#ff9800',
        },
    },
    typography: {
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 600,
            marginBottom: '1rem',
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
        },
        h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.6,
        },
    },
    shape: {
        borderRadius: 15,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-5px)',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 25,
                    textTransform: 'none',
                    fontSize: '1rem',
                    padding: '10px 20px',
                },
            },
        },
    },
});