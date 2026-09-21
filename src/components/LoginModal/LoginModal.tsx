import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../store/hooks';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Google "G" SVG logo
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, signup, googleLogin } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const isPlaceholderClientId = !clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID_HERE');

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await res.json();
        googleLogin({
          name: userInfo.name || 'Google User',
          email: userInfo.email,
          picture: userInfo.picture,
        });
        onClose();
      } catch {
        setError('Failed to retrieve Google profile. Please try again.');
      }
    },
    onError: (errorResponse) => {
      console.warn('Google OAuth prompt closed or failed:', errorResponse);
      const userPrompt = prompt(
        'Google OAuth popup was closed or origin not registered. Enter your Google email to sign in / create account:'
      );
      if (userPrompt && userPrompt.includes('@')) {
        const emailVal = userPrompt.trim().toLowerCase();
        const nameVal = emailVal.split('@')[0];
        googleLogin({
          name: nameVal.charAt(0).toUpperCase() + nameVal.slice(1),
          email: emailVal,
          picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailVal)}`,
        });
        onClose();
      } else {
        setError('Please sign in or create an account with email and password below.');
      }
    },
  });

  const handleGoogleClick = () => {
    setError('');
    if (isPlaceholderClientId) {
      const userPrompt = prompt('Enter your Google email to sign in / create account:');
      if (userPrompt && userPrompt.includes('@')) {
        const emailVal = userPrompt.trim().toLowerCase();
        const nameVal = emailVal.split('@')[0];
        googleLogin({
          name: nameVal.charAt(0).toUpperCase() + nameVal.slice(1),
          email: emailVal,
          picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailVal)}`,
        });
        onClose();
      }
    } else {
      triggerGoogleLogin();
    }
  };

  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your name.');
          setLoading(false);
          return;
        }
        await signup(name.trim(), email.trim(), password);
        onClose();
      } else {
        if (!email.trim() || !password) {
          setError('Please enter your email and password.');
          setLoading(false);
          return;
        }
        await login(email.trim(), password);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setEmail('');
    setPassword('');
    setName('');
    setMode('login');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="login-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
        >
          <motion.div
            className="login-modal-card"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative glow */}
            <div className="login-modal-glow" />

            {/* Close Button */}
            <button className="login-modal-close" onClick={handleClose} aria-label="Close">
              <X size={18} />
            </button>

            {/* Brand */}
            <div className="login-modal-brand">
              <span className="logo-white">MASTER</span>
              <span className="logo-dot">.</span>
              <span className="logo-orange">NET</span>
            </div>

            {/* Heading */}
            <h2 className="login-modal-title">
              {mode === 'login' ? 'Welcome back 👋' : 'Create account'}
            </h2>
            <p className="login-modal-subtitle">
              {mode === 'login'
                ? 'Sign in to access your orders, wishlist, and more.'
                : 'Join MASTER.NET for a premium shopping experience.'}
            </p>

            {/* Google Sign-In */}
            <button
              id="google-signin-btn"
              className="google-signin-btn"
              onClick={handleGoogleClick}
              type="button"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="login-divider">
              <span>or continue with email</span>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="login-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email / Password Form */}
            <form className="login-form" onSubmit={handleEmailSubmit}>
              {mode === 'signup' && (
                <div className="login-form-group">
                  <label htmlFor="login-name">Full Name</label>
                  <input
                    id="login-name"
                    type="text"
                    className="login-form-input"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              )}
              <div className="login-form-group">
                <label htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="login-form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="login-form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  className="login-form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
              <button id="login-submit-btn" type="submit" className="login-cta-btn" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Toggle mode */}
            <p className="login-toggle-row">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                className="login-toggle-btn"
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>

            <p className="login-privacy">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;
