import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { RolePermissions, UserRole } from '../auth/roles';

interface PrivateRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
  const { isAuthenticated, role, address } = useAuth();
  const location = useLocation();

  // 1. Not connected to wallet -> Go to Login
  if (!address) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Connected but no role selected (Registration needed) -> Go to Login (where role selection happens)
  if (!role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Authenticated but checking specific role permission
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to their own dashboard if trying to access unauthorized page
    const userHome = RolePermissions[role][0]; 
    return <Navigate to={userHome} replace />;
  }

  return <>{children}</>;
};
