import { useState, useEffect } from 'react';
import { useAuthStore } from '../shared/stores/authStore';
import { auth } from '../infrastructure/firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithCredential, 
  GoogleAuthProvider, 
  updateProfile,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { open } from '@tauri-apps/plugin-shell';
import { listen } from '@tauri-apps/api/event';
import { useNavigate } from 'react-router-dom';
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Sparkles, 
  Eye, 
  EyeOff, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TauriClient } from '@/infrastructure/tauri-client';
import { cn } from '@/shared/utils/cn';
import { ProfileSetup } from '../components/ui/profile-setup';

export const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    // If the user is logged in, only auto-navigate if we are not explicitly showing the setup
    if (user && !showProfileSetup) {
      navigate('/');
    }
  }, [user, navigate, showProfileSetup]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Sign Up validations
    if (!isLogin) {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password should be at least 6 characters.');
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
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (innerErr: any) {
          // If user not found or invalid credential, automatically try to sign them up
          if (innerErr.code === 'auth/user-not-found' || innerErr.code === 'auth/invalid-credential' || innerErr.code === 'auth/invalid-login-credentials') {
            try {
              const newCred = await createUserWithEmailAndPassword(auth, email, password);
              if (name.trim()) {
                await updateProfile(newCred.user, { displayName: name.trim() });
              }
            } catch (signUpErr: any) {
              throw signUpErr;
            }
          } else {
            throw innerErr;
          }
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      }
      setShowProfileSetup(true);
    } catch (err: any) {
      if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please sign in instead.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again or reset your password.');
      } else {
        setError(err.message?.replace('Firebase:', '').trim() || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Please enter your email address to reset password.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg('Recovery link sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message?.replace('Firebase:', '').trim() || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = "http://127.0.0.1:1422/auth/callback";
      const scope = encodeURIComponent("openid email profile");
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
      
      let unlistenToken: () => void;
      let unlistenError: () => void;
      
      const waitForResult = new Promise<{token?: string, error?: string}>((resolve) => {
        listen<string>('oauth_id_token', (event) => {
          if (unlistenToken) unlistenToken();
          if (unlistenError) unlistenError();
          resolve({ token: event.payload });
        }).then(u => unlistenToken = u);

        listen<string>('oauth_error', (event) => {
          if (unlistenToken) unlistenToken();
          if (unlistenError) unlistenError();
          resolve({ error: event.payload });
        }).then(u => unlistenError = u);
      });

      // Open user's external browser
      await open(url);

      // Wait for the rust server to exchange code for token
      const result = await waitForResult;

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.token) {
        const credential = GoogleAuthProvider.credential(result.token);
        await signInWithCredential(auth, credential);
        setShowProfileSetup(true);
      } else {
        throw new Error("Failed to obtain token from Google");
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(err.message || "Failed to authenticate with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser: any = {
      uid: 'local-guest-' + Date.now(),
      email: 'user@bacham.local',
      displayName: 'Local User',
      photoURL: 'avatar:1',
    };
    setUser(guestUser);
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/');
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
    navigate('/');
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
          className="relative z-10 w-full max-w-[340px] overflow-hidden rounded-2xl border border-white/20 bg-white/[0.10] backdrop-blur-2xl shadow-2xl p-4 text-white"
        >
          <ProfileSetup 
            onComplete={handleProfileComplete} 
            defaultUsername={user?.displayName || email.split('@')[0] || name || ''} 
            className="bg-transparent border-none text-white" 
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4 selection:bg-white/20 selection:text-white overflow-y-auto">
      {/* Background Video (Clean, 100% visible) */}
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

      {/* Ultra-Transparent Ethereal Frosted Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[340px] overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.15)_inset] p-5 text-white my-auto"
      >
        {/* Subtle Specular Top Rim Reflection */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        <div className="relative z-10">
          {/* Header Title */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
              {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
            </h1>
            <p className="mt-1 text-xs text-white/70 font-medium">
              {isForgotPassword 
                ? 'Enter your email to recover access.' 
                : (isLogin ? 'Sign in to access your workspace.' : 'Sign up to get started.')}
            </p>
          </div>

          {/* Segmented Switcher (Sign In vs Sign Up) */}
          {!isForgotPassword && (
            <div className="relative flex p-0.5 rounded-lg bg-white/[0.08] border border-white/15 backdrop-blur-md mb-4">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); setSuccessMsg(''); }}
                className={cn(
                  "relative flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 z-10 flex items-center justify-center cursor-pointer",
                  isLogin ? "text-white" : "text-white/60 hover:text-white"
                )}
              >
                {isLogin && (
                  <motion.div
                    layoutId="glassAuthTabPill"
                    className="absolute inset-0 rounded-md bg-white/20 shadow-xs border border-white/25 -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); setSuccessMsg(''); }}
                className={cn(
                  "relative flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 z-10 flex items-center justify-center cursor-pointer",
                  !isLogin ? "text-white" : "text-white/60 hover:text-white"
                )}
              >
                {!isLogin && (
                  <motion.div
                    layoutId="glassAuthTabPill"
                    className="absolute inset-0 rounded-md bg-white/20 shadow-xs border border-white/25 -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                Sign Up
              </button>
            </div>
          )}

          {/* Feedback Banners */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error-banner"
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                className="mb-3.5 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-950/40 p-2.5 text-[11px] text-red-200 backdrop-blur-md overflow-hidden"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400" />
                <span className="leading-snug font-medium">{error}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                key="success-banner"
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                className="mb-3.5 flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-emerald-950/40 p-2.5 text-[11px] text-emerald-200 backdrop-blur-md overflow-hidden"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" />
                <span className="leading-snug font-medium">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forgot Password View */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/80">
                  Email Address
                </label>
                <div className="relative flex items-center rounded-lg border border-white/20 bg-white/[0.06] backdrop-blur-md transition-all focus-within:border-white/50 focus-within:ring-2 focus-within:ring-white/20 focus-within:bg-white/[0.10]">
                  <Mail className="absolute left-2.5 h-3.5 w-3.5 text-white/50 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg bg-transparent py-2 pl-8 pr-3 text-xs text-white placeholder:text-white/40 outline-none font-medium"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-white hover:bg-white/90 py-2 text-xs font-semibold text-neutral-950 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-950" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Recovery Link</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
                className="w-full flex items-center justify-center gap-1 py-0.5 text-[11px] font-medium text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Sign In
              </button>
            </form>
          ) : (
            /* Main Form (Sign In / Sign Up) */
            <form onSubmit={handleEmailAuth} className="space-y-2.5">
              {/* Full Name field on Sign Up */}
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  <label className="text-[11px] font-semibold text-white/80">
                    Full Name
                  </label>
                  <div className="relative flex items-center rounded-lg border border-white/20 bg-white/[0.06] backdrop-blur-md transition-all focus-within:border-white/50 focus-within:ring-2 focus-within:ring-white/20 focus-within:bg-white/[0.10]">
                    <User className="absolute left-2.5 h-3.5 w-3.5 text-white/50 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg bg-transparent py-2 pl-8 pr-3 text-xs text-white placeholder:text-white/40 outline-none font-medium"
                      placeholder="Alex Rivera"
                      required
                    />
                  </div>
                </motion.div>
              )}

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/80">
                  Email Address
                </label>
                <div className="relative flex items-center rounded-lg border border-white/20 bg-white/[0.06] backdrop-blur-md transition-all focus-within:border-white/50 focus-within:ring-2 focus-within:ring-white/20 focus-within:bg-white/[0.10]">
                  <Mail className="absolute left-2.5 h-3.5 w-3.5 text-white/50 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg bg-transparent py-2 pl-8 pr-3 text-xs text-white placeholder:text-white/40 outline-none font-medium"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-white/80">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }}
                      className="text-[10px] font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center rounded-lg border border-white/20 bg-white/[0.06] backdrop-blur-md transition-all focus-within:border-white/50 focus-within:ring-2 focus-within:ring-white/20 focus-within:bg-white/[0.10]">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-transparent py-2 pl-3 pr-8 text-xs text-white placeholder:text-white/40 outline-none font-medium"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 text-white/50 hover:text-white transition-colors p-1 cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password on Sign Up */}
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  <label className="text-[11px] font-semibold text-white/80">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center rounded-lg border border-white/20 bg-white/[0.06] backdrop-blur-md transition-all focus-within:border-white/50 focus-within:ring-2 focus-within:ring-white/20 focus-within:bg-white/[0.10]">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg bg-transparent py-2 pl-3 pr-8 text-xs text-white placeholder:text-white/40 outline-none font-medium"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 text-white/50 hover:text-white transition-colors p-1 cursor-pointer"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-white hover:bg-white/90 py-2.5 text-xs font-semibold text-neutral-950 transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-950" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  <>
                    {isLogin ? <LogIn className="h-3.5 w-3.5 text-neutral-950" /> : <UserPlus className="h-3.5 w-3.5 text-neutral-950" />}
                    <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Alternative Logins */}
          {!isForgotPassword && (
            <>
              <div className="relative my-3.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/15" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-black/20 backdrop-blur-md rounded-full text-white/50 font-semibold uppercase tracking-wider text-[10px]">
                    or continue with
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {/* Guest Login */}
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.08] hover:bg-white/[0.14] py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] backdrop-blur-md shadow-xs cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Continue as Local User</span>
                </button>

                {/* Google Login */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.08] hover:bg-white/[0.14] py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] backdrop-blur-md shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>

              {/* Bottom toggle between sign in and sign up */}
              <div className="mt-4 text-center text-xs text-white/70">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }}
                  className="font-bold text-white hover:underline transition-colors ml-0.5 cursor-pointer"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
