import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState('mentee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Update user profile with selected role
      const updates = {
        role: selectedRole,
        updated_at: new Date()
      };

      // If this is a new role selection, initialize the roles array
      if (!userProfile?.roles || userProfile.roles.length === 0) {
        updates.roles = [selectedRole];
      } else if (!userProfile.roles.includes(selectedRole)) {
        // Add the selected role to the roles array if not already present
        updates.roles = [...userProfile.roles, selectedRole];
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Navigate based on selected role
      const dashboardPaths = {
        mentee: '/components/dashboard/mentee',
        mentor: '/components/dashboard/mentor',
        hod: '/components/dashboard/hod',
        project_coordinator: '/components/dashboard/coordinator',
      };
      const dashboardPath = dashboardPaths[selectedRole] || dashboardPaths.mentee;
      navigate(dashboardPath, { replace: true });

    } catch (error) {
      console.error('Role update error:', error);
      setError('Failed to update role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If user already has a confirmed role (not pending), redirect them
  if (userProfile?.role && userProfile.role !== 'pending' && userProfile.role !== 'mentee') {
    const dashboardPaths = {
      mentee: '/components/dashboard/mentee',
      mentor: '/components/dashboard/mentor',
      hod: '/components/dashboard/hod',
      project_coordinator: '/components/dashboard/coordinator',
    };
    
    const dashboardPath = dashboardPaths[userProfile.role] || dashboardPaths.mentee;
    navigate(dashboardPath, { replace: true });
    return null;
  }
  
  // If user has pending role, allow them to select a role
  if (userProfile?.role === 'pending') {
    console.log('User has pending role, showing role selection page');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h3 className="font-bold text-lg mb-4 text-center">Select Your Role</h3>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Welcome! Please select your role to continue.
        </p>

        <form onSubmit={handleRoleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Choose your role:</label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="mentee"
                  checked={selectedRole === 'mentee'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Mentee</span>
                  <p className="text-sm text-gray-600">Student working on projects</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="mentor"
                  checked={selectedRole === 'mentor'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Mentor</span>
                  <p className="text-sm text-gray-600">Faculty guiding students</p>
                </div>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="project_coordinator"
                  checked={selectedRole === 'project_coordinator'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Project Coordinator</span>
                  <p className="text-sm text-gray-600">Managing project activities</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="hod"
                  checked={selectedRole === 'hod'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">HOD</span>
                  <p className="text-sm text-gray-600">Head of Department</p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Continue'}
          </button>

          {error && (
            <p className="text-center text-red-500 text-sm mt-3">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default RoleSelection;