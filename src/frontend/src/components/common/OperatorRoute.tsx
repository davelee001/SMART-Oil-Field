import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { OperatorScope } from '../../utils/auth';

const OperatorRoute: React.FC<{ scope: OperatorScope; children: JSX.Element }> = ({ scope, children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'ADMINISTRATOR' && user.operatorScope !== scope) {
        return <Navigate to="/workspaces" replace />;
    }
    return children;
};

export default OperatorRoute;
