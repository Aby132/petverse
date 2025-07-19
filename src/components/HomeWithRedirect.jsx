import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Home from '../pages/Home';

const HomeWithRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('HomeWithRedirect - Auth state:', {
      loading,
      user: user ? user.username : null,
      userRole,
      hasUser: !!user
    });

    // Only redirect if user is authenticated and not loading
    if (!loading && user && userRole) {
      console.log('User authenticated, checking role for redirect:', userRole);

      if (userRole === 'admin') {
        console.log('🔴 Admin user detected, redirecting to admin dashboard');
        navigate('/admin-dashboard', { replace: true });
      } else {
        console.log('🔵 Regular user detected, staying on home page');
      }
    } else if (!loading && !user) {
      console.log('🟡 No user authenticated, showing public home page');
    }
  }, [user, userRole, loading, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // For non-authenticated users or regular users, show the normal Home page
  return <Home />;
};

export default HomeWithRedirect;
