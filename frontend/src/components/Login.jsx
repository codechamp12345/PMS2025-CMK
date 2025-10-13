import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, validateEmailDomain, isAuthenticated, user, userProfile } = useAuth();
  
  // Handle navigation after successful authentication
  useEffect(() => {
    if (isAuthenticated && user && userProfile) {
      console.log('User authenticated with profile, redirecting to dashboard');
      setLoading(false);

      // Use the dashboard redirect component for reliable routing
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, userProfile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    // Basic validation
    if (!email.trim()) {
      setLoginError('Please enter your email address.');
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setLoginError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await signIn(email.toLowerCase().trim(), password);

      if (error) {
        // Show user-friendly error messages
        if (error.message.includes('verify your email')) {
          setLoginError(error.message);
        } else if (error.message.includes('Invalid login credentials')) {
          setLoginError('Invalid email or password. Please check your credentials.');
        } else if (error.message.includes('Email not confirmed')) {
          setLoginError('Please verify your email address before signing in. Check your inbox for the verification link.');
        } else if (error.message.includes('Too many requests')) {
          setLoginError('Too many login attempts. Please wait a moment and try again.');
        } else {
          setLoginError(error.message);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Login successful - navigation will be handled by useEffect
        console.log('Login successful, user authenticated');
        
        // Set a timeout to prevent infinite loading
        setTimeout(() => {
          if (loading) {
            console.log('Navigation timeout, stopping loading');
            setLoading(false);
          }
        }, 5000);
        return;
      }

    } catch (error) {
      console.error('Login error:', error);
      setLoginError('An error occurred. Please try again later.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setLoginError('');

    try {
      const { data, error } = await signInWithGoogle();

      if (error) {
        setLoginError(error.message);
        return;
      }

      // Google OAuth will redirect, so we don't need to handle navigation here
    } catch (error) {
      console.error('Google sign-in error:', error);
      setLoginError('Failed to sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h3 className="font-bold text-lg mb-4">Login</h3>

        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label htmlFor="email" className='block text-sm font-medium'>Email</label>
            <input
              id="email"
              type="email"
              placeholder='Enter your @git-india.edu.in email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full px-3 py-2 border rounded-md outline-none'
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {import.meta.env.DEV ? (
                <>Only @git-india.edu.in emails are allowed<br/>
                <span className="text-blue-600">Development: Test emails also accepted</span></>
              ) : (
                'Only @git-india.edu.in emails are allowed'
              )}
            </p>
          </div>

          <div className='mb-4'>
            <label htmlFor="password" className='block text-sm font-medium'>
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder='Enter your password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full px-3 py-2 border rounded-md outline-none'
              required
            />
          </div>

          <div className='mb-4'>
            <button 
              type="submit" 
              disabled={loading}
              className='w-full py-2 px-4 text-white bg-pink-500 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed'
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </div>

          <div className='mb-4'>
            <div className='text-center text-gray-500 mb-2'>or</div>
            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className='w-full py-2 px-4 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center'
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </div>

          {loginError && <p className="text-center text-red-500 text-sm">{loginError}</p>}

          <p className='text-sm text-center'>
            Don't have an account? <a href="/signup" className='text-blue-500 underline'>Sign up</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
