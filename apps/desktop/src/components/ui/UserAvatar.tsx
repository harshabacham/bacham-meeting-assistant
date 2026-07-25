
import { avatars } from './profile-setup';

export const UserAvatar = ({ photoURL, email, className }: { photoURL?: string | null, email?: string | null, className?: string }) => {
    if (photoURL?.startsWith('avatar:')) {
        const avatarId = parseInt(photoURL.split(':')[1], 10);
        const avatar = avatars.find(a => a.id === avatarId);
        if (avatar) {
            return (
                <div className={`flex items-center justify-center bg-surface-hover overflow-hidden rounded-full ${className}`}>
                    <div className="w-full h-full scale-[1.5] transform flex items-center justify-center">
                        {avatar.svg}
                    </div>
                </div>
            );
        }
    }

    if (photoURL) {
        return <img src={photoURL} alt="Avatar" className={`object-cover rounded-full ${className}`} />;
    }

    return (
        <div className={`flex items-center justify-center font-bold bg-gradient-to-br from-surface to-surface-hover rounded-full ${className}`}>
            {email?.charAt(0).toUpperCase() || 'U'}
        </div>
    );
};
