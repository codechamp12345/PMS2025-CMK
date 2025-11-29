import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FaPlus, FaUsers, FaProjectDiagram, FaExclamationTriangle, FaCheckCircle, FaTrash, FaFileCsv } from 'react-icons/fa';
import CSVImport from './CSVImport';

const ProjectCoordinatorDashboard = () => {
  const { signOut, userProfile: authUserProfile, activeRole, updateActiveRole } = useAuth();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [duration, setDuration] = useState('1 Semester');
  const [menteeEntries, setMenteeEntries] = useState([{ name: '', email: '' }]);

  const navigate = useNavigate();

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      console.log('Initializing ProjectCoordinatorDashboard...');
      await checkUser();
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      setError('Failed to initialize dashboard');
      setLoading(false);
    }
  };

  const checkUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      if (error || !currentUser) {
        navigate('/login');
        return;
      }

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userData || userData.role !== 'project_coordinator') {
        navigate('/login');
        return;
      }

      setUser(currentUser);
      setUserProfile(userData);

      await fetchProjects(userData.id);

    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async (coordinatorId) => {
    try {
      const coordinator = coordinatorId || userProfile?.id;
      if (!coordinator) return;

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          mentor:users!projects_mentor_id_fkey(id, name, email),
          project_assignments (mentor_name, mentor_email, status)
        `)
        .eq('assigned_by', coordinator)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
        return;
      }

      const allMenteeIds = new Set();
      (data || []).forEach(project => {
        (project.mentees || []).forEach(id => allMenteeIds.add(id));
      });

      let menteeLookup = new Map();
      if (allMenteeIds.size > 0) {
        const { data: menteeProfiles, error: menteeFetchError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', Array.from(allMenteeIds));

        if (menteeFetchError) {
          console.error('Error fetching mentee profiles:', menteeFetchError);
        } else if (menteeProfiles) {
          menteeLookup = new Map(menteeProfiles.map(profile => [profile.id, profile]));
        }
      }

      const hydratedProjects = (data || []).map(project => {
        const assignmentInfo = Array.isArray(project.project_assignments) ? project.project_assignments[0] : null;
        const menteeProfiles = (project.mentees || [])
          .map(id => menteeLookup.get(id))
          .filter(Boolean);

        const mentorDisplayName = project.mentor?.name
          || assignmentInfo?.mentor_name
          || null;

        const mentorContactEmail = project.mentor?.email
          || assignmentInfo?.mentor_email
          || project.mentor_email
          || null;

        return {
          ...project,
          menteeProfiles,
          mentorDisplayName,
          mentorContactEmail
        };
      });

      setProjects(hydratedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const handleMenteeInputChange = (index, field, value) => {
    setMenteeEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddMenteeField = () => {
    setMenteeEntries(prev => [...prev, { name: '', email: '' }]);
  };

  const handleRemoveMenteeField = (index) => {
    setMenteeEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAssignment = async () => {
    const trimmedProjectName = projectName.trim();
    const trimmedDetails = projectDetails.trim();
    const trimmedMentorName = mentorName.trim();
    const trimmedMentorEmail = mentorEmail.trim().toLowerCase();

    if (!trimmedProjectName || !trimmedDetails || !trimmedMentorName || !trimmedMentorEmail) {
      setError('Please complete all required fields before assigning the project');
      return;
    }

    if (!['1 Semester', '2 Semesters', '3 Semesters'].includes(duration)) {
      setError('Please select a valid project duration');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedMentorEmail)) {
      setError('Please enter a valid mentor email address');
      return;
    }

    const preparedMentees = menteeEntries
      .map(entry => ({
        name: entry.name.trim(),
        email: entry.email.trim().toLowerCase()
      }))
      .filter(entry => entry.email);

    if (preparedMentees.length === 0) {
      setError('Please add at least one mentee with a valid email address');
      return;
    }

    for (const mentee of preparedMentees) {
      if (!emailRegex.test(mentee.email)) {
        setError(`Invalid mentee email: ${mentee.email}`);
        return;
      }
    }

    if (!userProfile?.id) {
      setError('Unable to determine the current coordinator. Please refresh and try again.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const { data: mentorProfile, error: mentorLookupError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', trimmedMentorEmail)
        .maybeSingle();

      if (mentorLookupError) {
        console.error('Error looking up mentor:', mentorLookupError);
        setError('Failed to verify mentor. Please try again later.');
        return;
      }

      const uniqueMenteeEmails = Array.from(new Set(preparedMentees.map(mentee => mentee.email)));

      const { data: menteeProfilesData, error: menteeLookupError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('email', uniqueMenteeEmails);

      if (menteeLookupError) {
        console.error('Error looking up mentees:', menteeLookupError);
        setError('Failed to verify mentees. Please try again later.');
        return;
      }

      const menteeProfileMap = new Map(
        (menteeProfilesData || []).map(profile => [profile.email.toLowerCase(), profile])
      );

      const menteeProfiles = preparedMentees.map(entry => {
        const profile = menteeProfileMap.get(entry.email);
        if (profile) {
          return {
            id: profile.id,
            name: entry.name || profile.name || profile.email.split('@')[0],
            email: profile.email,
            isExisting: true
          };
        }
        return {
          id: null,
          name: entry.name || entry.email.split('@')[0],
          email: entry.email,
          isExisting: false
        };
      });

      const existingMenteeIds = menteeProfiles
        .filter(profile => profile.id)
        .map(profile => profile.id);

      const mentorDisplayName = mentorProfile?.name
        ? mentorProfile.name
        : trimmedMentorName;

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          project_name: trimmedProjectName,
          project_details: trimmedDetails,
          mentor_id: mentorProfile?.id || null,
          mentor_email: trimmedMentorEmail,
          mentees: existingMenteeIds,
          assigned_by: userProfile.id
        })
        .select()
        .single();

      if (projectError) {
        throw projectError;
      }

      const { data: assignment, error: assignmentError } = await supabase
        .from('project_assignments')
        .insert({
          project_id: project.id,
          project_name: trimmedProjectName,
          mentor_id: mentorProfile?.id || null,
          mentor_name: mentorDisplayName,
          mentor_email: trimmedMentorEmail,
          created_by: userProfile.id,
          status: 'pending',
          duration: duration
        })
        .select()
        .maybeSingle();

      if (assignmentError) {
        console.error('Error creating project assignment record:', assignmentError);
      }

      if (assignment?.id && menteeProfiles.length > 0) {
        const menteeAssignmentPayload = menteeProfiles.map(profile => ({
          assignment_id: assignment.id,
          mentee_id: profile.id,
          mentee_name: profile.name,
          mentee_email: profile.email
        }));

        const { error: menteeAssignmentError } = await supabase
          .from('project_assignment_mentees')
          .insert(menteeAssignmentPayload);

        if (menteeAssignmentError) {
          console.error('Error storing mentee assignments:', menteeAssignmentError);
        }
      }

      await fetchProjects(userProfile.id);

      setProjectName('');
      setProjectDetails('');
      setMentorName('');
      setMentorEmail('');
      setMenteeEntries([{ name: '', email: '' }]);

      const pendingMentees = menteeProfiles.filter(profile => !profile.id);
      setSuccess(
        pendingMentees.length > 0
          ? `Project assigned. Pending mentee accounts: ${pendingMentees.map(m => m.email).join(', ')}`
          : 'Project assigned successfully!'
      );

      console.log('Project assigned successfully');

    } catch (error) {
      console.error('Error creating project assignment:', error);
      setError(`Failed to assign project: ${error.message}`);
    }
  };

  const handleCSVImportComplete = async (importResults) => {
    try {
      // Refresh projects list
      await fetchProjects(userProfile.id);
      
      // Show success message
      if (importResults.success > 0) {
        setSuccess(`Successfully imported ${importResults.success} projects from CSV!`);
        setShowCSVImport(false);
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error refreshing after CSV import:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading coordinator dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project Coordinator Dashboard</h1>
              <p className="text-gray-600">Welcome back, {userProfile.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCSVImport(!showCSVImport)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <FaFileCsv /> {showCSVImport ? 'Hide CSV Import' : 'Import CSV'}
              </button>
              
              {/* Role Switching Dropdown */}
              {authUserProfile?.roles && authUserProfile.roles.length > 1 && (
                <div>
                  <select
                    value={activeRole || (authUserProfile.roles.length > 0 ? authUserProfile.roles[0] : '')}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      if (newRole && newRole !== activeRole) {
                        updateActiveRole(newRole);
                        const dashboardPaths = {
                          mentee: '/components/dashboard/mentee',
                          mentor: '/components/dashboard/mentor',
                          hod: '/components/dashboard/hod',
                          project_coordinator: '/components/dashboard/coordinator',
                        };
                        const dashboardPath = dashboardPaths[newRole] || dashboardPaths.project_coordinator;
                        navigate(dashboardPath, { replace: true });
                      }
                    }}
                    className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {authUserProfile.roles.map((role) => (
                      <option key={role} value={role}>
                        {role === 'project_coordinator' ? 'Coordinator' : role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <button
                onClick={async () => {
                  try {
                    await signOut();
                    navigate('/');
                  } catch (error) {
                    console.error('Logout error:', error);
                    navigate('/');
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaCheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-green-700">{success}</p>
                <button
                  onClick={() => setSuccess(null)}
                  className="mt-2 text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* CSV Import Section */}
        {showCSVImport && (
          <div className="mb-8">
            <CSVImport 
              onImportComplete={handleCSVImportComplete}
              coordinatorId={userProfile?.id}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assignment Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Assign New Project</h2>

            {/* Project Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Project Details */}
            <div className="space-y-2">
              <label htmlFor="projectDetails" className="block text-sm font-medium text-gray-700">Project Details</label>
              <textarea
                id="projectDetails"
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Enter project description, requirements, and any other relevant details..."
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                Project Duration
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="1 Semester">1 Semester (6 months)</option>
                <option value="2 Semesters">2 Semesters (12 months)</option>
                <option value="3 Semesters">3 Semesters (1.5 years)</option>
              </select>
            </div>

            {/* Mentor Details */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mentor Name *
              </label>
              <input
                type="text"
                value={mentorName}
                onChange={(e) => setMentorName(e.target.value)}
                placeholder="Enter mentor's full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mentor Email *
              </label>
              <input
                type="email"
                value={mentorEmail}
                onChange={(e) => setMentorEmail(e.target.value)}
                placeholder="mentor@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Mentees Entry */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Mentees *
                </label>
                <button
                  type="button"
                  onClick={handleAddMenteeField}
                  className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  <FaPlus className="mr-1" /> Add Mentee
                </button>
              </div>
              <div className="space-y-2">
                {menteeEntries.map((mentee, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                    <input
                      type="text"
                      value={mentee.name}
                      onChange={(e) => handleMenteeInputChange(index, 'name', e.target.value)}
                      placeholder="Mentee name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      value={mentee.email}
                      onChange={(e) => handleMenteeInputChange(index, 'email', e.target.value)}
                      placeholder="mentee@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {menteeEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMenteeField(index)}
                        className="inline-flex items-center justify-center px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Provide at least one mentee email associated with an existing user account.
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitAssignment}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <FaPlus className="mr-2" />
              Assign Project
            </button>
          </div>

          {/* Assigned Projects */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">My Assigned Projects ({projects.length})</h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FaProjectDiagram className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 text-sm">No projects assigned yet</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{project.project_name}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.project_details}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                          <span className="flex items-center">
                            <FaUsers className="mr-1" />
                            Mentor: {project.mentor?.name || 'Not found'}
                          </span>
                          <span>Mentees: {project.mentees?.length || 0}</span>
                        </div>
                      </div>
                    </div>

                    {project.mentees && project.mentees.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Assigned Mentees:</p>
                        <div className="flex flex-wrap gap-2">
                          {project.mentees.map((mentee, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                            >
                              {mentee.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Assigned: {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectCoordinatorDashboard;
