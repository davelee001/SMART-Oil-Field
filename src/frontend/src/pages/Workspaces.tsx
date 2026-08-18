import React from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Container, Grid, Typography } from '@mui/material';
import { ArrowForward, Business, LocationOn } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { OPERATOR_WORKSPACES } from '../data/operators';

const Workspaces: React.FC = () => {
    const { user } = useAuth();
    if (!user) return null;
    const workspaces = Object.values(OPERATOR_WORKSPACES).filter(
        (workspace) => user.role === 'ADMINISTRATOR' || user.operatorScope === workspace.scope,
    );

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={800}>Operations workspace</Typography>
                <Typography color="text.secondary">
                    Select the operator environment authorized for your account.
                </Typography>
            </Box>
            {workspaces.length === 0 ? (
                <Alert severity="warning">
                    Your account has not been assigned to an operating company. Contact a system administrator.
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    {workspaces.map((workspace) => (
                        <Grid item xs={12} md={user.role === 'ADMINISTRATOR' ? 4 : 7} key={workspace.scope}>
                            <Card sx={{ height: '100%', borderTop: `6px solid ${workspace.color}` }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Chip label={workspace.shortName} sx={{ bgcolor: workspace.color, color: workspace.foreground, fontWeight: 900, mb: 2 }} />
                                    <Typography variant="h5" fontWeight={800}>{workspace.name}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, color: 'text.secondary' }}>
                                        <Business fontSize="small" /><Typography variant="body2">{workspace.basin}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, color: 'text.secondary' }}>
                                        <LocationOn fontSize="small" /><Typography variant="body2">Based in {workspace.base}</Typography>
                                    </Box>
                                    <Button component={Link} to={workspace.route} variant="contained" endIcon={<ArrowForward />} sx={{ mt: 3, bgcolor: workspace.color, color: workspace.foreground, '&:hover': { bgcolor: workspace.color, filter: 'brightness(0.92)' } }}>
                                        Open workspace
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Container>
    );
};

export default Workspaces;
