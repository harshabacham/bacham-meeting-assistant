import { create } from 'zustand';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../../infrastructure/firebase/config';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId?: string;
  emailVerified?: boolean;
}

interface AuthState {
  user: (AppUser | User) | null;
  isLoading: boolean;
  setUser: (user: (AppUser | User) | null) => void;
  initialize: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => {
    if (user) {
      const serializable: AppUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        providerId: (user as any).providerId || (user as any).providerData?.[0]?.providerId || 'google.com',
        emailVerified: (user as any).emailVerified ?? true,
      };
      try {
        localStorage.setItem('bacham_auth_user', JSON.stringify(serializable));
      } catch (e) {
        console.warn('Failed to persist user session to localStorage:', e);
      }
      set({ user });
    } else {
      localStorage.removeItem('bacham_auth_user');
      set({ user: null });
    }
  },
  initialize: () => {
    // Attempt to restore user immediately from localStorage
    let initialUser: AppUser | null = null;
    const saved = localStorage.getItem('bacham_auth_user');
    if (saved) {
      try {
        initialUser = JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved auth user:', e);
      }
    }

    if (initialUser) {
      set({ user: initialUser, isLoading: false });
    }

    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const serializable: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          providerId: firebaseUser.providerData?.[0]?.providerId || 'firebase',
          emailVerified: firebaseUser.emailVerified,
        };
        try {
          localStorage.setItem('bacham_auth_user', JSON.stringify(serializable));
        } catch (e) {
          console.warn('Failed to persist user session to localStorage:', e);
        }
        set({ user: firebaseUser, isLoading: false });
      } else {
        // Firebase returned null. Check if we have an active Google OAuth / local session
        const currentSaved = localStorage.getItem('bacham_auth_user');
        if (currentSaved) {
          try {
            const parsed = JSON.parse(currentSaved);
            if (parsed && (parsed.providerId === 'google.com' || parsed.providerId === 'local' || parsed.email)) {
              set({ user: parsed, isLoading: false });
              return;
            }
          } catch {
            // ignore
          }
        }
        localStorage.removeItem('bacham_auth_user');
        set({ user: null, isLoading: false });
      }
    });
  },
  signOut: async () => {
    try {
      localStorage.removeItem('bacham_auth_user');
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    } finally {
      localStorage.removeItem('bacham_auth_user');
      set({ user: null });
    }
  },
}));
