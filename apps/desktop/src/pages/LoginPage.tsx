import { useState } from 'react';
import { useAuthStore } from '../shared/stores/authStore';
import { auth } from '../infrastructure/firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithCredential, 
  GoogleAuthProvider, 
  updateProfile 
} from 'firebase/auth';
import { open } from '@tauri-apps/plugin-shell';
import { listen } from '@tauri-apps/api/event';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Loader2,
  ArrowRight,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TauriClient } from '@/infrastructure/tauri-client';
import { ProfileSetup } from '../components/ui/profile-setup';

export const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  
  const navigate = useNavigate();
  const { user, setUser, signOut } = useAuthStore();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
          if (auth.currentUser?.displayName) {
            const hasSetupStorage = localStorage.getItem('hasSetupStoragePath') === 'true';
            if (!hasSetupStorage) {
              localStorage.setItem('needs_storage_setup', 'true');
              navigate('/setup-storage');
            } else {
              navigate('/');
            }
            return;
          }
        } catch (innerErr: any) {
          if (innerErr.code === 'auth/user-not-found' || innerErr.code === 'auth/invalid-credential' || innerErr.code === 'auth/invalid-login-credentials') {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (signUpErr: any) {
              throw signUpErr;
            }
          } else {
            throw innerErr;
          }
        }
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setShowProfileSetup(true);
    } catch (err: any) {
      if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please sign in instead.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err.message?.replace('Firebase:', '').trim() || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
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

      await open(url);
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
    const hasSetupStorage = localStorage.getItem('hasSetupStoragePath') === 'true';
    if (!hasSetupStorage) {
      localStorage.setItem('needs_storage_setup', 'true');
      navigate('/setup-storage');
    } else {
      navigate('/');
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
      <div className="relative flex h-screen w-full items-center justify-center p-4 bg-[#0A0A0C] overflow-hidden select-none">
        {/* Subtle Ambient Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-lime/10 rounded-full blur-[140px] pointer-events-none" />
        </div>

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
          className="relative z-10 w-full max-w-[360px] overflow-hidden rounded-3xl border border-white/10 bg-[#141517]/95 shadow-2xl p-6 text-white"
        >
          <ProfileSetup 
            onComplete={handleProfileComplete} 
            defaultUsername={user?.displayName || email.split('@')[0] || ''} 
            className="relative z-10 bg-transparent border-none text-white" 
          />
        </motion.div>
      </div>
    );
  }

  // If user is already authenticated and visits /login, give them immediate options to continue or switch account
  if (user) {
    const handleContinue = () => {
      const hasSetupStorage = localStorage.getItem('hasSetupStoragePath') === 'true';
      if (!hasSetupStorage) {
        localStorage.setItem('needs_storage_setup', 'true');
        navigate('/setup-storage');
      } else {
        navigate('/');
      }
    };

    const handleSwitchAccount = async () => {
      await signOut();
    };

    return (
      <div className="relative flex min-h-screen w-full items-center justify-center p-4 bg-[#0A0A0C] text-white selection:bg-lime selection:text-black overflow-y-auto">
        {/* Subtle Ambient Glow */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-lime/10 rounded-full blur-[140px] pointer-events-none" />
        </div>

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

        {/* Active Account Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 w-full max-w-[360px] overflow-hidden rounded-3xl border border-white/10 bg-[#141517]/95 p-7 text-white shadow-2xl backdrop-blur-xl"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Bacham Logo" 
                className="w-9 h-9 rounded-xl object-contain shadow-sm" 
              />
              <span className="font-bold text-xl tracking-tight text-white">
                Bacham
              </span>
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">Active Account Found</h2>
              <p className="text-xs text-white/60 mt-0.5">You are already signed into your workspace.</p>
            </div>

            <div className="w-full p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center text-lime font-bold text-sm shrink-0">
                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || <UserIcon size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.displayName || 'Local User'}</p>
                <p className="text-[11px] text-white/50 truncate font-mono">{user.email || 'user@bacham.local'}</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-lime shrink-0" title="Connected" />
            </div>

            <div className="w-full space-y-2 pt-2">
              <button
                type="button"
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime hover:bg-[#aef520] py-2.5 text-xs font-bold text-black shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>Continue to Workspace</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={handleSwitchAccount}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-2.5 text-xs font-medium text-white/70 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
              >
                <LogOut size={13} className="text-white/50" />
                <span>Use a Different Account</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4 bg-[#0A0A0C] text-white selection:bg-lime selection:text-black overflow-y-auto font-sans">
      {/* Subtle Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-lime/5 rounded-full blur-[120px] pointer-events-none" />
      </div>

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

      {/* Sign In / Sign Up Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-[360px] overflow-hidden rounded-3xl border border-white/10 bg-[#141517]/95 p-7 text-white shadow-2xl backdrop-blur-xl my-auto"
      >
        {/* Brand Header */}
        <div className="relative z-10 text-center mb-6">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <img 
              src="/logo.png" 
              alt="Bacham Logo" 
              className="w-9 h-9 rounded-xl object-contain shadow-sm" 
            />
            <span className="font-bold text-xl tracking-tight text-white">
              Bacham
            </span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="mt-1 text-xs text-white/50 font-normal">
            {isLogin ? 'Sign in to access your meeting intelligence.' : 'Get started with Bacham today.'}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="relative z-10 mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleEmailAuth} className="relative z-10 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] hover:border-white/20 focus:border-lime focus:ring-1 focus:ring-lime/30 py-2.5 pl-10 pr-3.5 text-xs text-white placeholder:text-white/30 outline-none transition-all shadow-inner"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] hover:border-white/20 focus:border-lime focus:ring-1 focus:ring-lime/30 py-2.5 pl-10 pr-10 text-xs text-white placeholder:text-white/30 outline-none transition-all shadow-inner"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-lime hover:bg-[#aef520] py-2.5 text-xs font-bold text-black transition-all active:scale-[0.98] disabled:opacity-50 shadow-md cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                <span>Please wait...</span>
              </>
            ) : (
              <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative z-10 my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[10px]">
            <span className="px-2.5 py-0.5 bg-[#141517] text-white/40 font-medium uppercase tracking-wider rounded-full border border-white/10">
              or continue with
            </span>
          </div>
        </div>

        {/* Quick Access Buttons */}
        <div className="relative z-10 space-y-2">
          <button
            type="button"
            onClick={handleGuestLogin}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] py-2.5 text-xs font-medium text-white/90 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-lime" />
            <span>Continue as Local User</span>
          </button>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] py-2.5 text-xs font-medium text-white/90 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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

        {/* Switch Link */}
        <div className="relative z-10 mt-4 text-center text-xs text-white/50">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="font-semibold text-lime hover:underline transition-colors ml-0.5 cursor-pointer underline-offset-2"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
