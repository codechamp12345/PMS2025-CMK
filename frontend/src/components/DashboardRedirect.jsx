import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function DashboardRedirect() {
  const navigate = useNavigate();
  const { user, userProfile, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
      return;
    }

    // Wait for userProfile to be available
    if (!userProfile) {
      console.log('Waiting for user profile to load...');
      return;
    }

    // Determine role from profile or email
    let role = 'mentee'; // default

    if (userProfile?.role) {
      role = userProfile.role;
    } else {
      // Fallback: determine from email
      const email = user.email.toLowerCase();
      if (email.includes('hod@')) role = 'hod';
      else if (email.includes('mentor@')) role = 'mentor';
      else if (email.includes('coordinator@')) role = 'project_coordinator';
      else if (email.includes('admin@')) role = 'hod';
    }

    // Navigate to appropriate dashboard
    const dashboardPaths = {
      'mentee': '/components/dashboard/mentee',
      'mentor': '/components/dashboard/mentor',
      'hod': '/components/dashboard/hod',
      'project_coordinator': '/components/dashboard/coordinator'
    };

    const dashboardPath = dashboardPaths[role.toLowerCase()] || '/components/dashboard/mentee';

    console.log(`Dashboard redirect: ${user.email} -> ${dashboardPath} (role: ${role})`);
    navigate(dashboardPath, { replace: true });
  }, [user, userProfile, isAuthenticated, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}

export default DashboardRedirect;
