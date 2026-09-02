import { useState, useEffect } from 'react';
import { useAuthStore } from '../shared/stores/authStore';
import { auth } from '../infrastructure/firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Sparkles } from 'lucide-react';
import { ProfileSetup } from '../components/ui/profile-setup';

export const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    setLoading(true);
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setShowProfileSetup(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      setShowProfileSetup(true);
    } catch (err: any) {
      console.warn("Google sign-in error:", err);
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        setError('Google sign-in popup was blocked by Windows WebView. You can sign in instantly using Email & Password or click "Continue as Guest" below.');
      } else {
        setError(err.message || 'Failed to authenticate with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser: any = {
      uid: 'local-guest-' + Date.now(),
      email: 'user@bacham.local',
      displayName: 'Bacham User',
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
      <div className="relative flex h-screen w-full items-center justify-center bg-background text-foreground selection:bg-primary/20 p-4 overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260801_001207_ec20d138-aa45-4b2b-ab8c-bdc71607f240.mp4" type="video/mp4" />
        </video>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        
        <div className="relative z-10 w-full max-w-md">
          <ProfileSetup 
            onComplete={handleProfileComplete} 
            defaultUsername={user?.displayName || email.split('@')[0] || ''} 
            className="bg-surface/40 border-border backdrop-blur-xl text-foreground" 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-background text-foreground selection:bg-primary/20 overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260801_001207_ec20d138-aa45-4b2b-ab8c-bdc71607f240.mp4" type="video/mp4" />
      </video>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface/30 p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/10 blur-[100px]"></div>
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-primary/5 blur-[100px]"></div>
        
        <div className="relative z-10">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin ? 'Sign in to access your workspace.' : 'Sign up to get started.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-background/50 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:bg-background"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background/50 px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:bg-background"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-primary/10"
            >
              {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-3 text-muted-foreground text-xs font-medium">Or continue with</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-raised border border-border/80 py-3 text-sm font-semibold text-foreground transition-all hover:bg-surface-hover hover:border-primary/40 active:scale-[0.98] shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Continue as Local User (Instant Access)
            </button>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border/60 bg-surface/30 py-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold text-primary hover:opacity-85 transition-opacity"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
