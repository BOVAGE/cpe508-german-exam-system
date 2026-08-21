import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'ADMIN' | 'LECTURER' | 'STUDENT'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Verifying session credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login with origin state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to default dashboard matching user role
    const defaultRoute = {
      ADMIN: '/admin/dashboard',
      LECTURER: '/lecturer/dashboard',
      STUDENT: '/student/dashboard',
    }[user.role];

    return <Navigate to={defaultRoute || '/login'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
