import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function DashboardRedirect() {
  const navigate = useNavigate();
  const { user, userProfile, activeRole, isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('DashboardRedirect - User:', user);
    console.log('DashboardRedirect - UserProfile:', userProfile);
    console.log('DashboardRedirect - ActiveRole:', activeRole);
    console.log('DashboardRedirect - IsAuthenticated:', isAuthenticated);

    if (!isAuthenticated || !user) {
      console.log('Redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    // Wait for userProfile to be available
    if (!userProfile) {
      console.log('Waiting for user profile to load...');
      return;
    }

    // Check if user has a pending role
    if (userProfile.role === 'pending') {
      console.log('User has pending role, redirecting to role selection');
      navigate('/select-role', { replace: true });
      return;
    }

    // Use activeRole if available, otherwise fallback to first role or primary role
    const dashboardPaths = {
      mentee: '/components/dashboard/mentee',
      mentor: '/components/dashboard/mentor',
      hod: '/components/dashboard/hod',
      project_coordinator: '/components/dashboard/coordinator',
    };

    let roleToUse = activeRole;
    if (!roleToUse) {
      roleToUse = (userProfile.roles && userProfile.roles.length > 0)
        ? userProfile.roles[0]
        : userProfile.role;
    }

    const dashboardPath = dashboardPaths[roleToUse] || dashboardPaths.mentee;

    console.log(`Dashboard redirect: ${user.email} -> ${dashboardPath} (role: ${roleToUse})`);
    navigate(dashboardPath, { replace: true });
  }, [user, userProfile, activeRole, isAuthenticated, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
        <p className="text-white">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}

export default DashboardRedirect;
