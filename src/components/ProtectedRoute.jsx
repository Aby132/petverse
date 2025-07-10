import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null, redirectTo = '/login' }) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If a specific role is required and user doesn't have it, redirect
  if (requiredRole && userRole !== requiredRole) {
    // Redirect admin to admin dashboard, user to home
    const defaultRedirect = userRole === 'admin' ? '/admin-dashboard' : '/';
    return <Navigate to={defaultRedirect} replace />;
  }

  // User is authenticated and has required role (if any)
  return children;
};

// Specific components for different roles
export const AdminRoute = ({ children }) => {
  return (
    <ProtectedRoute requiredRole="admin" redirectTo="/login">
      {children}
    </ProtectedRoute>
  );
};

export const UserRoute = ({ children }) => {
  return (
    <ProtectedRoute requiredRole="user" redirectTo="/login">
      {children}
    </ProtectedRoute>
  );
};

// Component that redirects authenticated users based on their role
export const RoleBasedRedirect = () => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  if (userRole === 'admin') {
    return <Navigate to="/admin-dashboard" replace />;
  } else {
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;
