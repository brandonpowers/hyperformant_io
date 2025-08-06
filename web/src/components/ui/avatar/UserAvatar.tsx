import Image from 'next/image';
import { useSession } from 'next-auth/react';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
  user?: {
    name?: string | null;
    image?: string | null;
  } | null;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-20 h-20 text-2xl'
};

export default function UserAvatar({ 
  size = 'lg', 
  className = '',
  showFallback = true,
  user
}: UserAvatarProps) {
  const { data: session } = useSession();
  
  // Use passed user or fallback to session user
  const currentUser = user || session?.user;
  const userName = currentUser?.name || 'User';
  const userImage = currentUser?.image;
  
  const baseClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center ${className}`;

  // If user has an image, show it
  if (userImage) {
    return (
      <div className={`${baseClasses} overflow-hidden bg-gray-100 dark:bg-gray-700`}>
        <Image
          src={userImage}
          alt={userName}
          width={size === 'xl' ? 80 : size === 'lg' ? 40 : size === 'md' ? 32 : 24}
          height={size === 'xl' ? 80 : size === 'lg' ? 40 : size === 'md' ? 32 : 24}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // If no image and showFallback is false, return null
  if (!showFallback) {
    return null;
  }

  // Show first letter fallback
  const firstLetter = userName.charAt(0).toUpperCase();
  
  return (
    <div className={`${baseClasses} bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold`}>
      {firstLetter}
    </div>
  );
}