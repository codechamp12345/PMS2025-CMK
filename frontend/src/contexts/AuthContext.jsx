import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);

          // Try to load profile from localStorage first for faster loading
          const storedProfile = localStorage.getItem('userProfile');
          if (storedProfile) {
            try {
              const profile = JSON.parse(storedProfile);
              setUserProfile(profile);
              console.log('Profile loaded from localStorage:', profile);
            } catch (error) {
              console.error('Error parsing stored profile:', error);
            }
          }

          // Fetch profile in parallel, don't wait for it
          fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);

        if (session?.user) {
          console.log('Auth state change - User found:', session.user.email);

          // Check email domain for all users (including Google OAuth)
          if (!validateEmailDomain(session.user.email)) {
            console.error('Invalid email domain:', session.user.email);
            await supabase.auth.signOut();
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            return;
          }

          setUser(session.user);
          console.log('User set in context');

          // Create a temporary profile from user metadata if available
          const tempProfile = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
            role: session.user.user_metadata?.role || getRoleFromEmail(session.user.email),
            isVerified: true
          };

          // Set temporary profile immediately for navigation
          setUserProfile(tempProfile);
          console.log('Temporary profile set:', tempProfile);

          // Try to fetch real profile in background
          fetchUserProfile(session.user.id);
        } else {
          console.log('Auth state change - No user');
          setUser(null);
          setUserProfile(null);
        }
        setLoading(false);
        console.log('Auth loading set to false');
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId, retryCount = 0) => {
    console.log('Fetching user profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);

        // If user profile doesn't exist, try to create it manually
        if (error.code === 'PGRST116' && retryCount < 2) {
          console.log(`User profile not found, attempting to create... (attempt ${retryCount + 1})`);

          // Get current session to get user info
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Try to create the profile manually
            const { data: insertData, error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                role: session.user.user_metadata?.role || getRoleFromEmail(session.user.email),
                isVerified: true
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error creating user profile:', insertError);
              // Don't retry indefinitely - keep the temporary profile
              if (retryCount < 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return fetchUserProfile(userId, retryCount + 1);
              }
            } else {
              console.log('User profile created successfully:', insertData);
              setUserProfile(insertData);
              localStorage.setItem('userProfile', JSON.stringify(insertData));
              return;
            }
          }
        }

        // If we can't fetch or create the profile, keep the temporary one
        console.log('Keeping temporary profile for navigation');
        return;
      }

      console.log('User profile fetched successfully:', data);
      setUserProfile(data);
      // Store in localStorage for compatibility with existing components
      localStorage.setItem('userProfile', JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Keep temporary profile on error
      console.log('Keeping temporary profile due to error');
    }
  };

  // Email domain validation
  const validateEmailDomain = (email) => {
    // Development mode - allow specific test emails
    const isDevelopment = import.meta.env.DEV;
    const testEmails = [
      'atharvghosalkar22@gmail.com', // Your test email
      'test@gmail.com',
      'admin@gmail.com',
      'mentee@git-india.edu.in',
      'mentor@git-india.edu.in',
      'hod@git-india.edu.in',
      'coordinator@git-india.edu.in'
    ];
    
    if (isDevelopment && testEmails.includes(email.toLowerCase())) {
      return true;
    }
    
    return email.toLowerCase().endsWith('@git-india.edu.in');
  };

  // Determine role from email as fallback
  const getRoleFromEmail = (email) => {
    const emailLower = email.toLowerCase();
    if (emailLower.includes('hod@')) return 'hod';
    if (emailLower.includes('mentor@')) return 'mentor';
    if (emailLower.includes('coordinator@')) return 'project_coordinator';
    if (emailLower.includes('admin@')) return 'hod';
    return 'mentee'; // default
  };

  const signUp = async (email, password, userData) => {
    try {
      // Validate email domain
      if (!validateEmailDomain(email)) {
        throw new Error('Only @git-india.edu.in email addresses are allowed');
      }

      // Validate password strength
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Validate required fields
      if (!userData.name?.trim()) {
        throw new Error('Name is required');
      }

      const signupOptions = {
        data: {
          name: userData.name.trim(),
          role: userData.role || 'mentee'
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: signupOptions
      });

      if (error) throw error;
      
      // Return appropriate message based on environment
      const message = import.meta.env.DEV 
        ? 'Account created successfully! You will be logged in automatically.'
        : 'Please check your email and click the verification link to complete registration.';
      
      return { 
        data, 
        error: null,
        message
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      // Validate inputs
      if (!email?.trim()) {
        throw new Error('Email is required');
      }
      
      if (!password?.trim()) {
        throw new Error('Password is required');
      }

      // Validate email domain
      if (!validateEmailDomain(email)) {
        throw new Error('Only @git-india.edu.in email addresses are allowed');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) {
        console.error('Supabase auth error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText
        });
        
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
        }
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        }
        throw error;
      }

      // Check if user's email is verified (skip in development)
      if (data.user && !data.user.email_confirmed_at && !import.meta.env.DEV) {
        throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
      }

      console.log('Sign in successful:', data.user?.email);
      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const isDevelopment = import.meta.env.DEV;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
            // Only restrict domain in production
            ...(isDevelopment ? {} : { hd: 'git-india.edu.in' })
          }
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }
      
      console.log('Google OAuth initiated successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setUserProfile(null);
      // Clear localStorage
      localStorage.removeItem('userProfile');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    validateEmailDomain,
    isAuthenticated: !!user,
    isVerified: userProfile?.isVerified || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
