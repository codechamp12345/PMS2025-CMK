import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  FaEye,
  FaDownload,
  FaTrash,
  FaCommentDots,
  FaSpinner,
  FaSignOutAlt
} from 'react-icons/fa';

const submissionStages = [
  { key: 'ideaPresentation', label: 'Idea Presentation', allowedTypes: ['pdf'] },
  { key: 'progress1', label: 'Progress 1', allowedTypes: ['pdf', 'docx'] },
  { key: 'progress2', label: 'Progress 2', allowedTypes: ['pdf'] },
  { key: 'progress3', label: 'Progress 3', allowedTypes: ['ppt', 'pdf'] },
  { key: 'progress4', label: 'Progress 4', allowedTypes: ['ppt', 'pdf'] },
  { key: 'phase1', label: 'Phase 1 Report', allowedTypes: ['pdf'] },
  { key: 'finalReport', label: 'Final Report', allowedTypes: ['pdf'] },
  { key: 'finalDemo', label: 'Final Demo', allowedTypes: ['mp4', 'mkv'] },
  { key: 'finalPpt', label: 'Final PPT', allowedTypes: ['pdf'] },
  { key: 'codebook', label: 'Codebook', allowedTypes: ['docx', 'pdf'] },
  { key: 'achievements', label: 'Achievements', allowedTypes: ['pdf', 'txt', 'docx'] },
  { key: 'feedbackForm', label: 'Feedback Form', allowedTypes: [], isForm: true }
];

const statusOptions = [
  { value: 'accepted', label: 'Accepted', icon: '✅', color: 'text-green-600' },
  { value: 'needs improvement', label: 'Needs Improvement', icon: '⚠️', color: 'text-yellow-600' },
  { value: 'pending', label: 'Pending', icon: '⏳', color: 'text-gray-600' }
];

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

const MentorDashboard = () => {
  const navigate = useNavigate();
  const { signOut, userProfile, activeRole, updateActiveRole, updateUserProfile } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mentor, setMentor] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [projectDeliverables, setProjectDeliverables] = useState({});
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [remarkModal, setRemarkModal] = useState({ open: false, submission: null, remark: '' });
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [remark, setRemark] = useState('');
  const [selectedMenteeId, setSelectedMenteeId] = useState(null);
  const [deliverablesLoading, setDeliverablesLoading] = useState(false);
  const [projectFiles, setProjectFiles] = useState({});
  const [loadingProjectFiles, setLoadingProjectFiles] = useState(false);
  const [showBecomeMenu, setShowBecomeMenu] = useState(false);
  const projectFileChannelRef = useRef(null);
  const currentProjectIdsRef = useRef([]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          navigate('/');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Check if user has access to mentor dashboard (either as primary role or in roles array)
        // Also check if this is their active role
        const hasMentorAccess = profile?.role === 'mentor' || 
                             (profile?.roles && profile.roles.includes('mentor'));
      
        const isActiveRoleMentor = (activeRole || profile.role) === 'mentor';
      
        if (!hasMentorAccess || !isActiveRoleMentor) {
          // Redirect to appropriate dashboard based on active role
          const currentActiveRole = activeRole || profile.role;
          let redirectPath = '/';
        
          switch (currentActiveRole) {
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
        
          navigate(redirectPath);
          return;
        }

        const normalizedEmail = (profile.email || user.email || '').trim();
        const normalizedId = profile.id || user.id;
        setMentor({ ...profile, id: normalizedId, email: normalizedEmail });
      } catch (authError) {
        console.error('Auth error:', authError);
        toast.error('Unable to authenticate mentor.');
        navigate('/');
      } finally {
        setCheckingAuth(false);
      }
    };

    init();
  }, [navigate]);

  useEffect(() => {
    const loadSubmissions = async () => {
      if (!selectedProjectId) {
        setSubmissions([]);
        return;
      }

      setLoadingSubmissions(true);
      setError(null);

      try {
        const { data, error: submissionsError } = await supabase
          .from('submissions')
          .select('*')
          .eq('project_id', selectedProjectId)
          .order('created_at', { ascending: true });

        if (submissionsError) throw submissionsError;

        setSubmissions(data || []);
      } catch (loadError) {
        console.error('Submissions load error:', loadError);
        setError('Failed to load submissions.');
        toast.error('Failed to load submissions.');
        setSubmissions([]);
      } finally {
        setLoadingSubmissions(false);
      }
    };

    loadSubmissions();
  }, [selectedProjectId]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!mentor) return;
      setLoadingProjects(true);
      setError(null);

      const mentorId = mentor?.id || null;

      const emailVariants = new Set();
      if (mentor?.email) {
        const trimmed = mentor.email.trim();
        if (trimmed) {
          emailVariants.add(trimmed);
          emailVariants.add(trimmed.toLowerCase());
          emailVariants.add(trimmed.toUpperCase());
        }
      }

      try {
        const normalizedProjectMap = {};
        const aggregatedProjectIds = new Set();

        const projectFilters = [];
        if (mentorId) projectFilters.push(`mentor_id.eq.${mentorId}`);
        emailVariants.forEach(emailValue => {
          projectFilters.push(`mentor_email.eq.${emailValue}`);
        });

        if (projectFilters.length > 0) {
          const { data: directProjects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .or(projectFilters.join(','))
            .order('created_at', { ascending: false });

          if (projectsError) throw projectsError;

          (directProjects || []).forEach(project => {
            if (!project?.id) return;
            normalizedProjectMap[project.id] = project;
            aggregatedProjectIds.add(project.id);
          });
        }

        const teamFilters = [];
        if (mentorId) teamFilters.push(`user_id.eq.${mentorId}`);
        emailVariants.forEach(emailValue => {
          teamFilters.push(`email.eq.${emailValue}`);
        });

        if (teamFilters.length > 0) {
          const { data: teamAssignments, error: teamError } = await supabase
            .from('project_team_members')
            .select('project_id, role_in_project, user_id, email')
            .or(teamFilters.join(','));

          if (teamError) throw teamError;

          const mentorRoleMatch = (role) => {
            if (!role) return false;
            const normalized = role.toLowerCase();
            return normalized.includes('mentor');
          };

          const assignmentProjectIds = new Set();
          (teamAssignments || []).forEach(entry => {
            if (!entry?.project_id) return;
            if (!entry.role_in_project || mentorRoleMatch(entry.role_in_project)) {
              assignmentProjectIds.add(entry.project_id);
            }
          });

          const missingIds = Array.from(assignmentProjectIds).filter(projectId => !normalizedProjectMap[projectId]);

          if (missingIds.length > 0) {
            const { data: assignedProjects, error: assignedError } = await supabase
              .from('projects')
              .select('*')
              .in('id', missingIds)
              .order('created_at', { ascending: false });

            if (assignedError) throw assignedError;

            (assignedProjects || []).forEach(project => {
              if (!project?.id) return;
              normalizedProjectMap[project.id] = project;
              aggregatedProjectIds.add(project.id);
            });
          }

          assignmentProjectIds.forEach(id => aggregatedProjectIds.add(id));
        }

        const finalProjects = Array.from(Object.values(normalizedProjectMap))
          .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));

        setProjects(finalProjects);
        setError(null);

        if (finalProjects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(finalProjects[0]?.id || null);
        }

        if (finalProjects.length > 0) {
          try {
            await fetchAllProjectDeliverables(finalProjects);
          } catch (fetchError) {
            console.error('Error fetching deliverables:', fetchError);
          }
          const projectIds = finalProjects.map(project => project.id).filter(Boolean);
          currentProjectIdsRef.current = projectIds;
          await fetchProjectFiles(projectIds);
          setupProjectFilesSubscription(projectIds);
        } else {
          currentProjectIdsRef.current = [];
          setProjectFiles({});
          if (projectFileChannelRef.current) {
            await supabase.removeChannel(projectFileChannelRef.current);
            projectFileChannelRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error in fetchProjects:', error);
        setError('Failed to load projects');
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [mentor]);

  const fetchProjectFiles = async (projectIds) => {
    if (!mentor || !mentor.id || !projectIds || projectIds.length === 0) {
      setProjectFiles({});
      return;
    }

    setLoadingProjectFiles(true);

    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('id, project_id, uploaded_by, mentor_id, file_name, file_url, file_type, created_at')
        .eq('mentor_id', mentor.id)
        .in('project_id', projectIds);

      if (error) {
        throw error;
      }

      const menteeIds = Array.from(new Set((data || []).map(file => file.uploaded_by).filter(Boolean)));
      let uploaderMap = {};

      if (menteeIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', menteeIds);

        if (usersError) {
          throw usersError;
        }

        uploaderMap = (usersData || []).reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }

      const filesByProject = projectIds.reduce((acc, projectId) => {
        acc[projectId] = [];
        return acc;
      }, {});

      (data || []).forEach(file => {
        if (!filesByProject[file.project_id]) return;
        const uploader = uploaderMap[file.uploaded_by];
        const uploaderName = uploader?.name || uploader?.email || 'Mentee';
        const uploaderEmail = uploader?.email || '';
        filesByProject[file.project_id].push({
          ...file,
          uploaderName,
          uploaderEmail
        });
      });

      setProjectFiles(filesByProject);
    } catch (fetchError) {
      console.error('Error fetching project files:', fetchError);
      setError(prev => prev || 'Failed to load project files');
    } finally {
      setLoadingProjectFiles(false);
    }
  };

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const submissionsByStage = useMemo(() => {
    const map = new Map();
    submissions.forEach(sub => {
      map.set(sub.stage_key, sub);
    });
    return map;
  }, [submissions]);

  const projectLookup = useMemo(() => {
    const lookup = {};
    projects.forEach(project => {
      lookup[project.id] = project;
    });
    return lookup;
  }, [projects]);

  const handleStatusChange = async (submission, newStatus) => {
    if (!submission) return;
    try {
      const updating = toast.loading('Updating status...');
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ status: newStatus })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      toast.success('Status updated.');
      setSubmissions(prev => prev.map(item => item.id === submission.id ? { ...item, status: newStatus } : item));
      toast.dismiss(updating);
    } catch (statusError) {
      console.error('Status update error:', statusError);
      toast.error('Failed to update status.');
    }
  };

  const handleDeleteSubmission = async (submission) => {
    if (!submission) return;

    if (!window.confirm('Delete this file? This action cannot be undone.')) {
      return;
    }

    const deleting = toast.loading('Deleting file...');

    try {
      const filePath = submission.file_url?.split('/').pop();
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('project-deliverables')
          .remove([`project-deliverables/${filePath}`]);

        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submission.id);

      if (deleteError) throw deleteError;

      setSubmissions(prev => prev.filter(item => item.id !== submission.id));
      toast.success('File deleted.');
    } catch (deleteError) {
      console.error('Delete error:', deleteError);
      toast.error('Failed to delete file.');
    } finally {
      toast.dismiss(deleting);
    }
  };

  const handleOpenRemarkModal = (submission) => {
    if (!submission) return;
    setRemarkModal({ open: true, submission, remark: submission?.remark || '' });
  };

  const handleSaveRemark = async () => {
    if (!remarkModal.submission) {
      setRemarkModal({ open: false, submission: null, remark: '' });
      return;
    }

    const saving = toast.loading('Saving remark...');

    try {
      const { error: remarkError } = await supabase
        .from('submissions')
        .update({ remark: remarkModal.remark.trim() })
        .eq('id', remarkModal.submission.id);

      if (remarkError) throw remarkError;

      setSubmissions(prev => (
        prev.map(item => item.id === remarkModal.submission.id ? { ...item, remark: remarkModal.remark.trim() } : item)
      ));

      toast.success('Remark saved.');
      setRemarkModal({ open: false, submission: null, remark: '' });
    } catch (remarkError) {
      console.error('Remark save error:', remarkError);
      toast.error('Failed to save remark.');
    } finally {
      toast.dismiss(saving);
    }
  };

  const switchToRole = (newRole) => {
    if (newRole && newRole !== activeRole) {
      updateActiveRole(newRole);
      const dashboardPaths = {
        mentee: '/components/dashboard/mentee',
        mentor: '/components/dashboard/mentor',
        hod: '/components/dashboard/hod',
        project_coordinator: '/components/dashboard/coordinator',
      };
      const dashboardPath = dashboardPaths[newRole] || dashboardPaths.mentor;
      console.log(`Switching to role: ${newRole}, navigating to: ${dashboardPath}`);
      
      // Force a small delay to ensure state updates before navigation
      setTimeout(() => {
        navigate(dashboardPath, { replace: true });
      }, 100);
    }
  };

  const assignRoleToUser = async (newRole) => {
    try {
      // Get the current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Check if user already has this role
      if (userProfile?.roles && userProfile.roles.includes(newRole)) {
        // If user already has the role, just switch to it
        switchToRole(newRole);
        return;
      }

      // Add the new role to the user's roles array
      const updatedRoles = userProfile?.roles 
        ? [...userProfile.roles, newRole] 
        : [newRole];

      // Update the user's roles in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          roles: updatedRoles,
          updated_at: new Date()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user roles:', updateError);
        throw new Error('Failed to update user roles in database');
      }

      // Update the local user profile with the new roles
      const updatedProfile = {
        ...userProfile,
        roles: updatedRoles
      };
      
      updateUserProfile(updatedProfile);

      // Switch to the new role
      switchToRole(newRole);
    } catch (error) {
      console.error('Error assigning role:', error);
      setError('Failed to assign role. Please try again.');
      // Hide error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBecomeRole = async (role) => {
    setShowBecomeMenu(false);
    await assignRoleToUser(role);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const fetchAllProjectDeliverables = async (projects) => {
  if (!projects?.length) {
    setProjectDeliverables({});
    return;
  }

  try {
    const projectIds = projects.map(p => p.id).filter(Boolean);
    if (!projectIds.length) return;

    // Use the database function we created
    const { data, error } = await supabase
      .rpc('get_mentor_submissions', { project_ids: projectIds });

    if (error) {
      console.error('Error fetching submissions:', error);
      throw error;
    }

    // Process the data
    const deliverablesByProject = {};
    (data || []).forEach(submission => {
      const projectId = submission.project_id;
      if (!projectId) return;

      if (!deliverablesByProject[projectId]) {
        deliverablesByProject[projectId] = [];
      }

      deliverablesByProject[projectId].push({
        ...submission,
        users: {
          id: submission.user_id,
          name: submission.user_name || 'Unknown User',
          email: submission.user_email || 'unknown'
        }
      });
    });

    setProjectDeliverables(deliverablesByProject);
  } catch (error) {
    console.error('Error in fetchAllProjectDeliverables:', error);
  }
};

  const setupProjectFilesSubscription = (projectIds) => {
    if (!projectIds || projectIds.length === 0) {
      return;
    }

    // Clean up existing subscription
    if (projectFileChannelRef.current) {
      supabase.removeChannel(projectFileChannelRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel('project_files_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_files',
          filter: `mentor_id=eq.${mentor?.id}`
        },
        (payload) => {
          console.log('Project files change received:', payload);
          
          // Refresh project files for the affected project
          if (payload.new?.project_id) {
            fetchProjectFiles([payload.new.project_id]);
          }
        }
      )
      .subscribe();

    projectFileChannelRef.current = channel;
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <FaSpinner className="animate-spin text-3xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0B0F19] text-gray-100">
      <aside className="w-full md:w-1/4 lg:w-1/5 bg-gradient-to-b from-[#0B0F19] to-[#1B2430] border-r border-slate-800">
        <div className="px-6 py-8 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Mentor Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">Review assigned projects and submissions</p>
        </div>

        <div className="px-4 py-6 space-y-4 h-[calc(100vh-220px)] overflow-y-auto">
          {loadingProjects ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <FaSpinner className="animate-spin mr-2" />
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-10">
              No projects assigned.
            </div>
          ) : (
            projects.map(project => {
              const isActive = project.id === selectedProjectId;
              return (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 border ${
                    isActive
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                      : 'bg-slate-800/50 border-transparent hover:border-blue-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-sm font-semibold truncate">{project.title || project.project_name}</div>
                  <div className="text-xs text-slate-400 mt-1 truncate">{project.domain || 'No domain'}</div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-6 py-6 border-t border-slate-800">
          <div className="mb-4">
            <div className="text-sm font-semibold text-white">{mentor?.name || mentor?.email}</div>
            <div className="text-xs text-slate-400 capitalize">{mentor?.role}</div>
          </div>
          
          {/* Role Switching Buttons */}
          {userProfile?.roles && userProfile.roles.length > 1 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-2">Switch Role</label>
              <div className="flex flex-wrap gap-2">
                {userProfile.roles
                  .filter(role => role && role !== 'mentee') // Exclude mentee role
                  .map((role) => (
                    <button
                      key={role}
                      onClick={() => switchToRole(role)}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        activeRole === role
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {role === 'project_coordinator' ? 'Coordinator' : role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
              </div>
            </div>
          )}
          
          {/* Become button with dropdown */}
          <div className="relative mb-4">
            <button
              onClick={() => setShowBecomeMenu(!showBecomeMenu)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Become
            </button>
            
            {showBecomeMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-md shadow-lg py-1 z-10 border border-slate-700">
                <button
                  onClick={() => handleBecomeRole('hod')}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                >
                  Become a HOD
                </button>
                <button
                  onClick={() => handleBecomeRole('project_coordinator')}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                >
                  Become a Coordinator
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 text-gray-900 min-h-screen">
        {!selectedProject ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            <p>Select a project to view submissions.</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-8">
            <header className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{selectedProject.title || selectedProject.project_name}</h1>
                  <p className="text-slate-500 mt-2 max-w-3xl">{selectedProject.description || selectedProject.project_details || 'No description provided.'}</p>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                      {selectedProject.domain || 'Domain not set'}
                    </span>
                    {selectedProject.duration && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                        <span className="text-slate-600 text-xs mr-1">Duration:</span> {selectedProject.duration}
                      </span>
                    )}
                    {selectedProject.coordinatorAssignment?.duration && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                        <span className="text-slate-600 text-xs mr-1">Project Duration:</span> {selectedProject.coordinatorAssignment.duration}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-slate-400">
                    Last updated: {new Date(selectedProject.updated_at || selectedProject.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </header>

            <section className="bg-white rounded-2xl shadow-xl border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Uploaded Files Overview</h2>
                  <p className="text-sm text-slate-500">Track mentee submissions for each stage.</p>
                </div>
                {loadingSubmissions && (
                  <div className="flex items-center text-sm text-slate-400">
                    <FaSpinner className="animate-spin mr-2" />
                    Loading submissions...
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Section</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Filename</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {submissionStages.map(stage => {
                      const submission = submissionsByStage.get(stage.key);
                      const statusOption = statusOptions.find(option => option.value === (submission?.status || '').toLowerCase());

                      return (
                        <tr key={stage.key} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 text-sm font-medium text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{stage.label}</span>
                              <span className="text-xs text-slate-400">{stage.allowedTypes.length > 0 ? stage.allowedTypes.join(', ') : 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {submission ? submission.filename : '–'}
                          </td>
                          <td className="px-6 py-4">
                            {submission ? (
                              <div className="relative inline-block text-left">
                                <select
                                  value={(submission.status || 'pending').toLowerCase()}
                                  onChange={(event) => handleStatusChange(submission, event.target.value)}
                                  className="appearance-none bg-slate-100 border border-slate-300 rounded-lg py-2 pl-3 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                  {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">⌄</span>
                                {statusOption && (
                                  <div className={`mt-2 text-xs font-semibold ${statusOption.color}`}>
                                    {statusOption.icon} {statusOption.label}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">Not submitted</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={async () => {
                                  if (!submission) return;
                                  try {
                                    try {
                                      // If it's a direct URL, open it directly
                                      if (submission.file_url && submission.file_url.startsWith('http')) {
                                        window.open(submission.file_url, '_blank');
                                        return;
                                      }
                                      
                                      // Try to create a signed URL if we have a file_path
                                      if (submission.file_path) {
                                        const { data, error } = await supabase.storage
                                          .from('submissions')  // Make sure this matches your bucket name
                                          .createSignedUrl(submission.file_path, 3600);
                                        
                                        if (error) throw error;
                                        if (data?.signedUrl) {
                                          window.open(data.signedUrl, '_blank');
                                          return;
                                        }
                                      }
                                      
                                      // If we have a file_url but it's not http, try to use it directly
                                      if (submission.file_url) {
                                        window.open(submission.file_url, '_blank');
                                        return;
                                      }
                                      
                                      throw new Error('No valid file URL or path found');
                                    } catch (innerError) {
                                      throw innerError; // Re-throw to be caught by outer catch
                                    }
                                  } catch (error) {
                                    console.error('Error viewing file:', error);
                                    toast.error('Failed to open file. Please try again.');
                                  }
                                }}
                                disabled={!submission}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
                                  submission ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                <FaEye /> View
                              </button>
                              <button
                                onClick={async () => {
                                  if (!submission) return;
                                  const loadingToast = toast.loading('Preparing download...');
                                  
                                  try {
                                    // If it's a direct URL, download it directly
                                    if (submission.file_url?.startsWith('http')) {
                                      const link = document.createElement('a');
                                      link.href = submission.file_url;
                                      link.download = submission.filename || 'submission';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      toast.dismiss(loadingToast);
                                      toast.success('Download started');
                                      return;
                                    }
                                    
                                    // Handle Supabase Storage download
                                    let filePath = submission.file_path || submission.filename;
                                    if (filePath) {
                                      filePath = filePath.replace(/^[\/\\]+/, ''); // Clean path
                                      
                                      // First get the signed URL
                                      const { data, error } = await supabase.storage
                                        .from('submissions')
                                        .createSignedUrl(filePath, 3600);
                                      
                                      if (error) throw error;
                                      
                                      if (data?.signedUrl) {
                                        // Create a temporary link and trigger download
                                        const link = document.createElement('a');
                                        link.href = data.signedUrl;
                                        link.download = submission.filename || filePath.split('/').pop() || 'download';
                                        link.target = '_blank';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        
                                        toast.dismiss(loadingToast);
                                        toast.success('Download started');
                                        return;
                                      }
                                    }
                                    
                                    throw new Error('No valid file URL or path found for download');
                                  } catch (error) {
                                    console.error('Download error:', error);
                                    toast.dismiss(loadingToast);
                                    toast.error(error.message || 'Failed to download file');
                                  }
                                }}
                                disabled={!submission}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
                                  submission ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                <FaDownload /> Download
                              </button>
                              <button
                                onClick={() => submission && handleOpenRemarkModal(submission)}
                                disabled={!submission}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
                                  submission ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                <FaCommentDots /> Save Remark
                              </button>
                              <button
                                onClick={() => submission && handleDeleteSubmission(submission)}
                                disabled={!submission}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
                                  submission ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                <FaTrash /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!loadingSubmissions && submissions.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-6">No submissions yet.</div>
                )}
              </div>
            </section>

            <section className="mt-8 bg-white rounded-2xl shadow-xl border border-slate-200">
              <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Project Files</h2>
                  <p className="text-sm text-slate-500">Recent uploads from mentees on this project.</p>
                </div>
                {loadingProjectFiles && (
                  <div className="flex items-center text-sm text-slate-400">
                    <FaSpinner className="animate-spin mr-2" />
                    Loading files...
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                {(() => {
                  const files = projectFiles[selectedProject.id] || [];
                  if (!loadingProjectFiles && files.length === 0) {
                    return (
                      <div className="text-center text-slate-400 text-sm py-6">
                        No files uploaded yet.
                      </div>
                    );
                  }

                  return (
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Project</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Uploaded By</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">File Type</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Upload Date</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {files.map(file => {
                          const projectName = projectLookup[file.project_id]?.title || projectLookup[file.project_id]?.project_name || 'Project';
                          return (
                            <tr key={file.id} className="hover:bg-slate-50 transition">
                              <td className="px-6 py-4 text-sm text-slate-700">{projectName}</td>
                              <td className="px-6 py-4 text-sm text-slate-700">{file.uploaderName}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{file.file_type || 'Submission'}</td>
                              <td className="px-6 py-4 text-sm text-slate-500">{formatDate(file.created_at)}</td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => window.open(file.file_url, '_blank')}
                                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                  <FaEye /> View File
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </section>
          </div>
        )}
      </main>

      {remarkModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Add Remark</h3>
            <p className="text-sm text-slate-500 mb-4">
              {remarkModal.submission?.filename || 'Submission'}
            </p>
            <textarea
              value={remarkModal.remark}
              onChange={event => setRemarkModal(prev => ({ ...prev, remark: event.target.value }))}
              rows={4}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter feedback for this submission"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setRemarkModal({ open: false, submission: null, remark: '' })}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRemark}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                Save Remark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorDashboard;

