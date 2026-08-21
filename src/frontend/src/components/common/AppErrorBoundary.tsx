import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Home, Refresh } from '@mui/icons-material';

interface AppErrorBoundaryState {
    failed: boolean;
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
    state: AppErrorBoundaryState = { failed: false };

    static getDerivedStateFromError(): AppErrorBoundaryState {
        return { failed: true };
    }

    componentDidCatch(error: Error, details: React.ErrorInfo) {
        console.error('SMART Oil Field interface error', error, details);
    }

    render() {
        if (!this.state.failed) return this.props.children;

        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#d8e0e5', display: 'grid', placeItems: 'center', p: 2 }}>
                <Paper variant="outlined" sx={{ width: '100%', maxWidth: 520, p: { xs: 2.5, sm: 4 }, borderTop: '4px solid #d89a2b' }}>
                    <Typography variant="h5" fontWeight={800}>SMART Oil Field could not display this view</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                        The interface encountered a temporary problem. Reload the current view or return to the homepage.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ mt: 3 }}>
                        <Button variant="contained" startIcon={<Refresh />} onClick={() => window.location.reload()}>Reload view</Button>
                        <Button variant="outlined" startIcon={<Home />} onClick={() => window.location.assign('/')}>Go to homepage</Button>
                    </Stack>
                </Paper>
            </Box>
        );
    }
}

export default AppErrorBoundary;
