import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getStoredUser } from '../../utils/auth';

interface ProtectedRouteProps {
    children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const user = getStoredUser();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    return children;
};

export default ProtectedRoute;