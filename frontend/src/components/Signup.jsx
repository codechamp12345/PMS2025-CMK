import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('mentee');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [serverMessage, setServerMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, signIn, signInWithGoogle, validateEmailDomain } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setEmailError('');
    setPasswordError('');
    setServerMessage('');

    // Validate email domain
    if (!validateEmailDomain(email)) {
      setEmailError('Only @git-india.edu.in email addresses are allowed.');
      setLoading(false);
      return;
    }

    // Validate password
    if (password.length < 6) {
      setPasswordError('Password should be at least 6 characters long.');
      setLoading(false);
      return;
    }

    // Validate name
    if (!name.trim()) {
      setServerMessage('Name is required.');
      setLoading(false);
      return;
    }

    try {
      const { data, error, message } = await signUp(email.toLowerCase().trim(), password, {
        name: name.trim(),
        role: role
      });

      if (error) {
        setServerMessage(error.message);
        return;
      }

      if (data?.user) {
        // For development, skip email verification and login directly
        if (import.meta.env.DEV) {
          setServerMessage('Account created successfully! Logging you in...');
          
          // Clear form
          setName('');
          setEmail('');
          setPassword('');
          setRole('mentee');
          
          // Auto-login after successful signup in development
          try {
            const { data: loginData, error: loginError } = await signIn(email.toLowerCase().trim(), password);
            if (loginError) {
              console.log('Auto-login failed:', loginError.message);
              setServerMessage('Account created but login failed. Please try logging in manually.');
            } else {
              setServerMessage('Account created and logged in successfully!');
            }
          } catch (err) {
            console.log('Auto-login error:', err.message);
            setServerMessage('Account created but login failed. Please try logging in manually.');
          }
        } else {
          // Production: Show verification message
          const verificationMessage = message || 'Account created successfully! Please check your email and click the verification link to complete registration.';
          setServerMessage(verificationMessage);
          
          // Clear form
          setName('');
          setEmail('');
          setPassword('');
          setRole('mentee');
          
          // Redirect to verification page after 3 seconds
          setTimeout(() => {
            navigate('/verify-email');
          }, 3000);
        }
      }

    } catch (error) {
      console.error('Signup error:', error);
      setServerMessage('Error: Unable to register user');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setServerMessage('');

    try {
      const { data, error } = await signInWithGoogle();

      if (error) {
        setServerMessage(error.message);
        return;
      }

      // Google OAuth will redirect, so we don't need to handle navigation here
    } catch (error) {
      console.error('Google sign-up error:', error);
      setServerMessage('Failed to sign up with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h3 className="font-bold text-lg mb-4">Sign Up</h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium">
              Name *
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md outline-none"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium">
              Email *
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your @git-india.edu.in email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              className="w-full px-3 py-2 border rounded-md outline-none"
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
            {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium">
              Password *
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your Password (min 6 characters)"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              className="w-full px-3 py-2 border rounded-md outline-none"
              required
            />
            {passwordError && (
              <p className="text-red-500 text-sm">{passwordError}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-medium">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md outline-none"
            >
              <option value="mentor">Mentor</option>
              <option value="mentee">Mentee</option>
              <option value="project_coordinator">Project Coordinator</option>
              <option value="hod">HOD</option>
            </select>
          </div>

          <div className="mb-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 text-white bg-pink-500 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>

          <div className='mb-4'>
            <div className='text-center text-gray-500 mb-2'>or</div>
            <button 
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              className='w-full py-2 px-4 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center'
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Signing up...' : 'Sign up with Google'}
            </button>
          </div>

          {serverMessage && (
            <p className={`text-center text-sm ${serverMessage.includes('successfully') ? 'text-green-500' : 'text-red-500'}`}>
              {serverMessage}
            </p>
          )}

          <p className="text-sm text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-500 underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Signup;
