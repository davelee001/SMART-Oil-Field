import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PmsRole } from '../../utils/auth';

interface ProtectedRouteProps {
    children: JSX.Element;
    roles?: PmsRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <Box sx={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Restoring your secure session…</Typography>
                </Box>
            </Box>
        );
    }
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
    return children;
};

export default ProtectedRoute;
