import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/shared/stores/authStore';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useConfirmStore } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { ProfileSetup } from '@/components/ui/profile-setup';
import { auth } from '@/infrastructure/firebase/config';
import { updateProfile } from 'firebase/auth';
import { 
  User, Shield, LogOut, CheckCircle2, 
  Calendar, CheckSquare, Clock
} from 'lucide-react';

export const ProfileSettingsTab: React.FC = () => {
  const { t } = useTranslation();
  const { user, setUser, signOut } = useAuthStore();
  const { lectures } = useLectureStore();
  const { showConfirm } = useConfirmStore();
  const { showToast } = useToast();

  // Compute workspace stats
  const totalMeetings = lectures.length;
  const totalActionItems = lectures.reduce((acc, l) => {
    const intel = (l as any).artifacts?.['lecture_intelligence'];
    return acc + (intel?.action_items?.length || 0);
  }, 0);
  const totalMinutes = Math.round(
    lectures.reduce((acc, l) => acc + (l.durationMs || 0), 0) / 60000
  );

  const handleSignOut = async () => {
    const ok = await showConfirm('Are you sure you want to sign out of your Bacham account?');
    if (ok) {
      try {
        await signOut();
        showToast('Signed out successfully.', 'info');
      } catch (err: any) {
        showToast('Failed to sign out.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {t('settings.my_profile', 'My Profile')}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('settings.profile_desc', 'Manage your account details, avatar, and workspace identity.')}
        </p>
      </div>

      {/* Profile Setup & Identity Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Personal Identity</h3>
              <p className="text-xs text-muted-foreground">Customize how you appear across notes, team shares, and transcripts</p>
            </div>
          </div>
        </div>

        <ProfileSetup 
          variant="inline"
          defaultUsername={user?.displayName || ''} 
          defaultAvatarId={user?.photoURL?.startsWith('avatar:') ? parseInt(user.photoURL.split(':')[1]) : undefined}
          className="mx-0 max-w-full"
          onComplete={async (data) => {
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
                } as any);
                showToast(`Profile updated to ${data.username}!`, 'success');
              } catch (error) {
                console.error("Failed to update profile", error);
                showToast("Failed to update profile.", 'error');
              }
            } else {
              setUser({
                ...(user || {}),
                displayName: data.username,
                photoURL: `avatar:${data.avatarId}`,
                email: user?.email || 'guest@bacham.app'
              } as any);
              showToast(`Profile updated to ${data.username}!`, 'success');
            }
          }}
        />

        {/* Primary Email Address */}
        <div className="mt-6 pt-6 border-t border-border">
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Primary Account Email
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input 
                className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-medium opacity-90 outline-none cursor-not-allowed" 
                value={user?.email || 'guest@bacham.app'} 
                disabled 
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 size={13} />
                <span>Verified</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <Shield size={12} className="text-primary" />
            <span>Managed securely via Firebase Authentication with end-to-end encrypted session tokens.</span>
          </p>
        </div>
      </div>

      {/* Workspace Activity Statistics */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Workspace Metrics</h3>
            <p className="text-xs text-muted-foreground">Your productivity and transcription activity at a glance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-surface-raised border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Calendar size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{totalMeetings}</div>
              <div className="text-[11px] text-muted-foreground font-medium">Meetings Recorded</div>
            </div>
          </div>

          <div className="bg-surface-raised border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{totalMinutes}m</div>
              <div className="text-[11px] text-muted-foreground font-medium">Audio Processed</div>
            </div>
          </div>

          <div className="bg-surface-raised border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckSquare size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{totalActionItems}</div>
              <div className="text-[11px] text-muted-foreground font-medium">Action Items Tracked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Session Actions / Danger Zone */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Session & Authentication</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sign out of your account on this device. Your local meeting recordings will remain preserved.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="px-4 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/25 text-destructive text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
