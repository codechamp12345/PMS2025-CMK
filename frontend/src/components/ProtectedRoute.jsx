import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, requiredRole = null }) {
  const { user, userProfile, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for user profile to load
  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Check role-based access if required
  if (requiredRole && userProfile.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user's actual role
    const role = userProfile.role?.toLowerCase();
    let redirectPath = '/';

    switch (role) {
      case 'mentee':
        redirectPath = '/components/dashboard/mentee';
        break;
      case 'mentor':
        redirectPath = '/components/dashboard/mentor';
        break;
      case 'hod':
        redirectPath = '/components/dashboard/hod';
        break;
      case 'project_coordinator':
        redirectPath = '/components/dashboard/coordinator';
        break;
      default:
        redirectPath = '/';
    }

    return <Navigate to={redirectPath} replace />;
  }

  // Render the protected component
  return children;
}

export default ProtectedRoute;
