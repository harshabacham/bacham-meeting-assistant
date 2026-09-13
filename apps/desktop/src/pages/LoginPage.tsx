import { useState, useEffect, useRef } from 'react';
import { useAuthStore, AppUser } from '../shared/stores/authStore';
import { auth, googleProvider } from '../infrastructure/firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';
import { openUrl } from '@tauri-apps/plugin-opener';
import { open } from '@tauri-apps/plugin-shell';
import { listen } from '@tauri-apps/api/event';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock,
  User as UserIcon,
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileSetup } from '../components/ui/profile-setup';

export const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const unlistenTokenRef = useRef<(() => void) | null>(null);
  const unlistenErrorRef = useRef<(() => void) | null>(null);
  const authTimeoutRef = useRef<any>(null);

  const cleanupGoogleAuth = () => {
    if (unlistenTokenRef.current) {
      unlistenTokenRef.current();
      unlistenTokenRef.current = null;
    }
    if (unlistenErrorRef.current) {
      unlistenErrorRef.current();
      unlistenErrorRef.current = null;
    }
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
    setGoogleLoading(false);
  };

  useEffect(() => {
    return () => {
      cleanupGoogleAuth();
    };
  }, []);

  const handleCancelGoogleAuth = () => {
    cleanupGoogleAuth();
    setError('');
  };
  
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    if (user && !showProfileSetup) {
      const hasSetupStorage = localStorage.getItem('hasSetupStoragePath') === 'true';
      if (!hasSetupStorage) {
        localStorage.setItem('needs_storage_setup', 'true');
        navigate('/setup-storage');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate, showProfileSetup]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (!isLogin) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Direct email & password sign-in
        const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        localStorage.setItem('hasSeenOnboarding', 'true');

        if (userCred.user?.displayName) {
          const hasSetupStorage = localStorage.getItem('hasSetupStoragePath') === 'true';
          if (!hasSetupStorage) {
            localStorage.setItem('needs_storage_setup', 'true');
            navigate('/setup-storage');
          } else {
            navigate('/');
          }
        } else {
          setShowProfileSetup(true);
        }
      } else {
        // Sign-up flow
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        localStorage.setItem('hasSeenOnboarding', 'true');

        if (fullName.trim()) {
          try {
            await updateProfile(userCred.user, {
              displayName: fullName.trim()
            });
            setUser({
              ...userCred.user,
              displayName: fullName.trim()
            });
          } catch (profileErr) {
            console.warn('Initial displayName update failed:', profileErr);
          }
        }

        setShowProfileSetup(true);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      const code = err.code || '';
      if (
        code === 'auth/invalid-credential' || 
        code === 'auth/wrong-password' || 
        code === 'auth/user-not-found' || 
        code === 'auth/invalid-login-credentials'
      ) {
        setError(isLogin 
          ? 'Invalid email or password. If you do not have an account yet, click "Create Account" above.' 
          : 'Invalid account details. Please verify and try again.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later or reset your password.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.message?.replace('Firebase:', '').trim() || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setSuccessMessage('Password reset link sent! Check your inbox.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a moment before trying again.');
      } else {
        setError(err.message?.replace('Firebase:', '').trim() || 'Failed to send password reset email.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleAuth = async () => {
    setError('');
    setSuccessMessage('');
    setGoogleLoading(true);

    try {
      // 1. Try Firebase popup flow first (uses authorized domain bacham-tech.firebaseapp.com)
      try {
        const userCred = await signInWithPopup(auth, googleProvider);
        if (userCred.user) {
          setUser(userCred.user);
          localStorage.setItem('hasSeenOnboarding', 'true');
          if (userCred.user?.displayName) {
            const hasSetupStorage = localStorage.getItem('hasSetupStoragePath') === 'true';
            if (!hasSetupStorage) {
              localStorage.setItem('needs_storage_setup', 'true');
              navigate('/setup-storage');
            } else {
              navigate('/');
            }
          } else {
            setShowProfileSetup(true);
          }
          setGoogleLoading(false);
          return;
        }
      } catch (popupErr: any) {
        console.warn("Firebase popup sign-in did not complete, trying browser loopback flow:", popupErr);
        if (popupErr.code === 'auth/popup-closed-by-user') {
          setGoogleLoading(false);
          return;
        }
      }

      // 2. Fallback: 1-Click System Browser OAuth via local upload_server
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "15417749463-hqib9o5nf3fgpcvu1f9bv0gbm6jt06rf.apps.googleusercontent.com";
      const redirectUri = encodeURIComponent("http://localhost:1422/auth/callback");
      const scope = encodeURIComponent("openid email profile");
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&prompt=select_account`;

      cleanupGoogleAuth();

      // Listen for token or error from local upload_server on port 1422
      const pToken = listen<string>('oauth_id_token', async (event) => {
        cleanupGoogleAuth();
        try {
          let tokenData: any;
          try {
            tokenData = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
          } catch {
            tokenData = { id_token: event.payload };
          }

          let loggedInUser: AppUser | null = null;

          // Attempt to authenticate with Firebase Auth SDK using Google credential
          if (tokenData.id_token) {
            try {
              const credential = GoogleAuthProvider.credential(tokenData.id_token, tokenData.access_token);
              const userCred = await signInWithCredential(auth, credential);
              if (userCred.user) {
                loggedInUser = {
                  uid: userCred.user.uid,
                  email: userCred.user.email,
                  displayName: userCred.user.displayName,
                  photoURL: userCred.user.photoURL,
                  providerId: 'google.com',
                  emailVerified: true
                };
              }
            } catch (firebaseErr) {
              console.warn("Firebase credential sign-in fallback:", firebaseErr);
            }
          }

          // If Firebase credential auth didn't return, construct profile directly from Google payload
          if (!loggedInUser) {
            loggedInUser = {
              uid: tokenData.sub || `google_${Date.now()}`,
              email: tokenData.email || null,
              displayName: tokenData.name || (tokenData.email ? tokenData.email.split('@')[0] : 'Google User'),
              photoURL: tokenData.picture || null,
              providerId: 'google.com',
              emailVerified: true
            };
          }

          setUser(loggedInUser);
          localStorage.setItem('hasSeenOnboarding', 'true');

          if (loggedInUser.displayName) {
            const hasSetupStorage = localStorage.getItem('hasSetupStoragePath') === 'true';
            if (!hasSetupStorage) {
              localStorage.setItem('needs_storage_setup', 'true');
              navigate('/setup-storage');
            } else {
              navigate('/');
            }
          } else {
            setShowProfileSetup(true);
          }
        } catch (err: any) {
          console.error("Token processing error:", err);
          setError("Failed to complete sign-in. Please try again.");
        }
      });

      const pError = listen<string>('oauth_error', (event) => {
        cleanupGoogleAuth();
        const err = event.payload || "Google sign-in was cancelled or failed.";
        setError(err);
      });

      const [uToken, uError] = await Promise.all([pToken, pError]);
      unlistenTokenRef.current = uToken;
      unlistenErrorRef.current = uError;

      // 2 minute timeout for user to complete browser sign-in
      authTimeoutRef.current = setTimeout(() => {
        cleanupGoogleAuth();
        setError("Sign-in timed out. Please try again.");
      }, 120000);

      // Launch default system browser
      try {
        await openUrl(authUrl);
      } catch {
        try {
          await open(authUrl);
        } catch {
          window.open(authUrl, '_blank');
        }
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      cleanupGoogleAuth();
      setError(err.message || "Failed to start Google sign-in.");
    }
  };

  const handleProfileComplete = async (data: { username: string; avatarId: number }) => {
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: data.username,
          photoURL: `avatar:${data.avatarId}`
        });
        setUser({
          ...auth.currentUser,
          displayName: data.username,
          photoURL: `avatar:${data.avatarId}`
        });
      } catch (error) {
        console.error("Failed to update profile", error);
      }
    }
    localStorage.setItem('hasSeenOnboarding', 'true');
    const hasSetupStorage = localStorage.getItem('hasSetupStoragePath') === 'true';
    if (!hasSetupStorage) {
      localStorage.setItem('needs_storage_setup', 'true');
      navigate('/setup-storage');
    } else {
      navigate('/');
    }
  };

  if (showProfileSetup) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center p-4 overflow-hidden select-none">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-100 pointer-events-none select-none"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260801_001207_ec20d138-aa45-4b2b-ab8c-bdc71607f240.mp4" type="video/mp4" />
        </video>

        {/* Draggable Titlebar Region */}
        <div className="absolute top-0 left-0 right-36 h-10 z-50 pointer-events-auto">
          <div data-tauri-drag-region className="flex-1 h-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 w-full max-w-[340px] overflow-hidden rounded-3xl border border-black/10 bg-[#F2F2F2] shadow-[0_20px_50px_rgba(0,0,0,0.25),inset_0_1px_1px_0_rgba(255,255,255,0.9)] selection:bg-neutral-900 selection:text-white p-6 text-neutral-900"
        >
          {/* Ambient Specular Sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/70 to-transparent rounded-t-3xl" />

          <ProfileSetup 
            onComplete={handleProfileComplete} 
            defaultUsername={user?.displayName || fullName || email.split('@')[0] || ''} 
            className="relative z-10 bg-transparent border-none text-neutral-900" 
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4 selection:bg-neutral-900 selection:text-white overflow-y-auto">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-100 pointer-events-none select-none"
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260801_001207_ec20d138-aa45-4b2b-ab8c-bdc71607f240.mp4" type="video/mp4" />
      </video>

      {/* Draggable Titlebar Region */}
      <div className="absolute top-0 left-0 right-0 h-10 z-50 pointer-events-auto">
        <div data-tauri-drag-region className="flex-1 h-full" />
      </div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-[340px] overflow-hidden rounded-3xl border border-black/10 bg-[#F2F2F2] p-6 text-neutral-900 shadow-[0_20px_50px_rgba(0,0,0,0.25),inset_0_1px_1px_0_rgba(255,255,255,0.9)] selection:bg-neutral-900 selection:text-white my-auto"
      >
        {/* Ambient Specular Sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/70 to-transparent rounded-t-3xl" />

        {/* Card Header */}
        <div className="relative z-10 text-center mb-4">
          {isForgotPassword ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Reset Password
              </h1>
              <p className="mt-1 text-xs text-neutral-600 font-normal">
                Enter your email to receive recovery instructions.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="mt-1 text-xs text-neutral-600 font-normal">
                {isLogin ? 'Sign in to access your workspace.' : 'Sign up in seconds to start with BACHAM.'}
              </p>
            </>
          )}
        </div>

        {/* Auth Mode Segmented Pill Tabs */}
        {!isForgotPassword && (
          <div className="relative z-10 mb-4 p-1 flex rounded-2xl bg-neutral-200/80 border border-black/5">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); setSuccessMessage(''); }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isLogin ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); setSuccessMessage(''); }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                !isLogin ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-10 mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 text-left space-y-1.5"
            >
              {error.toLowerCase().includes("redirect_uri_mismatch") || error.toLowerCase().includes("redirect uri") ? (
                <>
                  <p className="font-bold text-neutral-900">Google Cloud Setup Required:</p>
                  <p className="text-[11px] leading-relaxed text-neutral-700">
                    Add <code className="font-mono bg-white/80 px-1 py-0.5 rounded text-neutral-900 font-semibold select-all">http://127.0.0.1:1422/auth/callback</code> to Authorized redirect URIs in Google Cloud Console, or sign in with Email &amp; Password below.
                  </p>
                  <button
                    type="button"
                    onClick={() => openUrl("https://console.cloud.google.com/apis/credentials?project=bacham-opensource").catch(console.error)}
                    className="mt-1 text-[11px] font-bold text-neutral-900 underline hover:text-black cursor-pointer block"
                  >
                    Open Google Cloud Console &rarr;
                  </button>
                </>
              ) : (
                <div className="text-center">{error}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Alert */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-10 mb-4 flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-800 text-center"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {isForgotPassword ? (
          <form onSubmit={handlePasswordReset} className="relative z-10 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-300 bg-white hover:border-neutral-400 focus:bg-white py-2.5 pl-10 pr-3.5 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none transition-all focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] selection:bg-neutral-900 selection:text-white"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 py-2.5 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  <span>Sending email...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError('');
                setSuccessMessage('');
              }}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        ) : (
          /* Normal Auth Form */
          <>
            <form onSubmit={handleEmailAuth} className="relative z-10 space-y-3">
              {/* Full Name for Sign Up */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-300 bg-white hover:border-neutral-400 focus:bg-white py-2.5 pl-10 pr-3.5 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none transition-all focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] selection:bg-neutral-900 selection:text-white"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-300 bg-white hover:border-neutral-400 focus:bg-white py-2.5 pl-10 pr-3.5 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none transition-all focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] selection:bg-neutral-900 selection:text-white"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-700">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError('');
                        setSuccessMessage('');
                      }}
                      className="text-[11px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-300 bg-white hover:border-neutral-400 focus:bg-white py-2.5 pl-10 pr-10 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none transition-all focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] selection:bg-neutral-900 selection:text-white"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password for Sign Up */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-300 bg-white hover:border-neutral-400 focus:bg-white py-2.5 pl-10 pr-10 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none transition-all focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] selection:bg-neutral-900 selection:text-white"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 py-2.5 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-md cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative z-10 my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-3 py-0.5 bg-[#F2F2F2] text-neutral-500 font-medium uppercase tracking-wider rounded-full border border-neutral-300">
                  or continue with
                </span>
              </div>
            </div>

            {/* Google Authentication Button */}
            <div className="relative z-10">
              {googleLoading ? (
                <div className="rounded-2xl border border-neutral-300 bg-white p-3.5 text-center shadow-xs space-y-2.5">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-neutral-900">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-900" />
                    <span>Waiting for browser sign-in...</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug px-1">
                    Complete sign-in in your browser window. Once authorized, you will automatically be signed in.
                  </p>
                  <div className="pt-2 flex justify-center border-t border-neutral-200/80">
                    <button
                      type="button"
                      onClick={handleCancelGoogleAuth}
                      className="text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors py-1 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-50 cursor-pointer"
                    >
                      Cancel Sign In
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white hover:bg-neutral-100/90 py-2.5 text-xs font-medium text-neutral-800 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>



            {/* Mode Switch (Sign in / Sign up) */}
            <div className="relative z-10 mt-4 text-center text-xs text-neutral-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => { 
                  setIsLogin(!isLogin); 
                  setError(''); 
                  setSuccessMessage('');
                }}
                className="font-semibold text-neutral-900 hover:underline transition-colors ml-0.5 cursor-pointer underline-offset-2"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
