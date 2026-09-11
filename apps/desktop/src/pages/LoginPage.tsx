import { useState, useEffect, useRef } from 'react';
import { useAuthStore, AppUser } from '../shared/stores/authStore';
import { auth, googleProvider } from '../infrastructure/firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';
import { openUrl } from '@tauri-apps/plugin-opener';
import { open } from '@tauri-apps/plugin-shell';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock,
  User as UserIcon,
  Eye, 
  EyeOff, 
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TauriClient } from '@/infrastructure/tauri-client';
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
  const [googleDeviceFlow, setGoogleDeviceFlow] = useState<{
    userCode: string;
    verificationUrl: string;
    deviceCode: string;
    expiresAt: number;
  } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const cancelFlowRef = useRef(false);

  const handleCopyCode = async () => {
    if (googleDeviceFlow?.userCode) {
      try {
        await navigator.clipboard.writeText(googleDeviceFlow.userCode);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 3000);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    }
  };

  const handleReopenVerification = async () => {
    if (googleDeviceFlow?.verificationUrl) {
      try {
        await openUrl(googleDeviceFlow.verificationUrl);
      } catch {
        try {
          await open(googleDeviceFlow.verificationUrl);
        } catch {
          window.open(googleDeviceFlow.verificationUrl, '_blank');
        }
      }
    }
  };

  const handleCancelDeviceFlow = () => {
    cancelFlowRef.current = true;
    setGoogleDeviceFlow(null);
    setGoogleLoading(false);
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
        setError('Invalid email or password. Please verify your credentials.');
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
    cancelFlowRef.current = false;

    const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);

    try {
      if (!isTauri) {
        // In standard browser environment, use Firebase popup flow
        const userCred = await signInWithPopup(auth, googleProvider);
        if (userCred.user) {
          setUser(userCred.user);
        }
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
        return;
      }

      // In Tauri desktop environment: Use Google OAuth 2.0 Device Authorization Flow (RFC 8628)
      // This eliminates redirect_uri_mismatch and "Error 400: invalid_request" completely.
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "439614603794-tupmghbga6mkho95e7rms1ml8du979bn.apps.googleusercontent.com";
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "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";

      const codeRes = await fetch('https://oauth2.googleapis.com/device/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          scope: 'openid email profile'
        }).toString()
      });

      if (!codeRes.ok) {
        const errText = await codeRes.text();
        throw new Error(`Google sign-in initiation failed: ${errText}`);
      }

      const codeData = await codeRes.json();
      const userCode = codeData.user_code;
      const verificationUrl = codeData.verification_url || 'https://www.google.com/device';
      const deviceCode = codeData.device_code;
      const intervalMs = (codeData.interval || 5) * 1000;
      const expiresAt = Date.now() + (codeData.expires_in || 1800) * 1000;

      // Copy code to clipboard immediately for instant paste
      try {
        await navigator.clipboard.writeText(userCode);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 4000);
      } catch {
        // ignore if blocked by browser policy
      }

      // Open Google verification page in default browser
      try {
        await openUrl(verificationUrl);
      } catch (openerErr) {
        try {
          await open(verificationUrl);
        } catch {
          window.open(verificationUrl, '_blank');
        }
      }

      setGoogleDeviceFlow({
        userCode,
        verificationUrl,
        deviceCode,
        expiresAt
      });

      // Poll Google token endpoint until user approves or cancels
      let tokenData: any = null;
      let currentInterval = intervalMs;

      while (Date.now() < expiresAt) {
        if (cancelFlowRef.current) {
          setGoogleDeviceFlow(null);
          setGoogleLoading(false);
          return;
        }

        const pollParams = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

        const pollRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: pollParams.toString()
        });

        const pollJson = await pollRes.json();

        if (pollRes.ok && pollJson.access_token) {
          tokenData = pollJson;
          break;
        } else if (pollJson.error === 'authorization_pending') {
          // Waiting for user to complete sign-in
        } else if (pollJson.error === 'slow_down') {
          currentInterval += 2000;
        } else if (pollJson.error === 'access_denied') {
          throw new Error("Sign-in was cancelled on Google.");
        } else if (pollJson.error === 'expired_token') {
          throw new Error("Sign-in session timed out. Please try again.");
        } else {
          throw new Error(pollJson.error_description || pollJson.error || "Authentication failed.");
        }

        await new Promise(resolve => setTimeout(resolve, currentInterval));
      }

      if (!tokenData?.access_token) {
        throw new Error("Google sign-in timed out. Please try again.");
      }

      // Fetch user profile from Google UserInfo endpoint
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      if (!userInfoRes.ok) {
        throw new Error("Failed to retrieve Google profile information.");
      }

      const profile = await userInfoRes.json();

      const authenticatedUser: AppUser = {
        uid: profile.sub || `google_${Date.now()}`,
        email: profile.email || null,
        displayName: profile.name || (profile.email ? profile.email.split('@')[0] : 'Google User'),
        photoURL: profile.picture || null,
        providerId: 'google.com',
        emailVerified: true
      };

      setUser(authenticatedUser);
      setGoogleDeviceFlow(null);
      localStorage.setItem('hasSeenOnboarding', 'true');

      if (authenticatedUser.displayName) {
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
      console.error("Google Auth Error:", err);
      const msg = err.message || '';
      if (err.code === 'auth/popup-closed-by-user' || msg.includes('access_denied') || msg.includes('cancelled')) {
        setError("Sign-in was cancelled.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Sign-in popup was blocked. Please allow popups for this app.");
      } else {
        setError(msg.replace('Firebase:', '').trim() || "Failed to authenticate with Google.");
      }
      setGoogleDeviceFlow(null);
    } finally {
      setGoogleLoading(false);
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

        {/* Top Window Controls */}
        <div className="absolute top-0 left-0 right-0 h-10 z-50 flex items-center justify-between px-4 pointer-events-auto">
          <div data-tauri-drag-region className="flex-1 h-full" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => TauriClient.minimize()}
              className="w-2.5 h-2.5 rounded-full bg-[#FFC15E] hover:brightness-110 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Minimize"
            />
            <button
              type="button"
              onClick={() => TauriClient.maximize()}
              className="w-2.5 h-2.5 rounded-full bg-[#5EFF9F] hover:brightness-110 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Maximize"
            />
            <button
              type="button"
              onClick={() => TauriClient.close()}
              className="w-2.5 h-2.5 rounded-full bg-[#FF5E5E] hover:brightness-110 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Close"
            />
          </div>
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

      {/* Draggable Titlebar Region & Window Controls */}
      <div className="absolute top-0 left-0 right-0 h-10 z-50 flex items-center justify-between px-4 pointer-events-auto">
        <div data-tauri-drag-region className="flex-1 h-full" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => TauriClient.minimize()}
            className="w-2.5 h-2.5 rounded-full bg-[#FFC15E] hover:brightness-110 shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Minimize"
          />
          <button
            type="button"
            onClick={() => TauriClient.maximize()}
            className="w-2.5 h-2.5 rounded-full bg-[#5EFF9F] hover:brightness-110 shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Maximize"
          />
          <button
            type="button"
            onClick={() => TauriClient.close()}
            className="w-2.5 h-2.5 rounded-full bg-[#FF5E5E] hover:brightness-110 shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Close"
          />
        </div>
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
        <div className="relative z-10 text-center mb-5">
          {googleDeviceFlow ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Google Sign In
              </h1>
              <p className="mt-1 text-xs text-neutral-600 font-normal">
                Authorize your Google account to proceed
              </p>
            </>
          ) : isForgotPassword ? (
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
                {isLogin ? 'Sign in to access your workspace.' : 'Sign up to get started with BACHAM.'}
              </p>
            </>
          )}
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-10 mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-700 text-center"
            >
              {error}
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

        {/* Google Device Flow Active View */}
        {googleDeviceFlow ? (
          <div className="relative z-10 space-y-4 text-center py-1">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-neutral-300 shadow-xs">
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>

            <div>
              <p className="text-xs text-neutral-600 font-medium">Enter this code in your browser:</p>
              <div 
                onClick={handleCopyCode}
                className="mt-2 inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-xs group"
                title="Click to copy code"
              >
                <span className="font-mono text-2xl font-bold tracking-widest text-neutral-900 selection:bg-neutral-900 selection:text-white">
                  {googleDeviceFlow.userCode}
                </span>
                <div className="p-1 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-600 group-hover:text-neutral-900">
                  {codeCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </div>
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                {codeCopied ? 'Code copied to clipboard!' : 'Click code to copy'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleReopenVerification}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 py-2.5 text-xs font-semibold text-white transition-all active:scale-[0.98] shadow-md cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Re-open Google Verification Page</span>
              </button>

              <div className="flex items-center justify-center gap-2 py-1 text-[11px] text-neutral-500 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-700" />
                <span>Waiting for approval in browser...</span>
              </div>

              <button
                type="button"
                onClick={handleCancelDeviceFlow}
                className="w-full mt-1 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isForgotPassword ? (
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
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white hover:bg-neutral-100/90 py-2.5 text-xs font-medium text-neutral-800 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-600" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
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
