'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Dropdown from './dropdown';

interface UserProfileDropdownProps {
  className?: string;
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  className = '',
}) => {
  const { data: session } = useSession();

  if (!session) {
    return null;
  }

  return (
    <Dropdown
      button={
        <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center cursor-pointer">
          <span className="text-white font-medium text-sm">
            {session?.user?.name?.[0] || 'U'}
          </span>
        </div>
      }
      classNames={`py-2 top-14 right-0 w-max ${className}`}
    >
      <div className="flex h-max w-56 flex-col justify-start rounded-[20px] bg-white bg-cover bg-no-repeat pb-4 shadow-xl shadow-shadow-500 dark:!bg-navy-700 dark:text-white dark:shadow-none">
        <div className="ml-4 mt-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-navy-700 dark:text-white">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <div className="mt-3 h-px w-full bg-gray-200 dark:bg-white/20" />

        <div className="ml-4 mt-3 flex flex-col">
          <Link
            href="/dashboard"
            className="text-sm text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 px-3 py-2 -ml-3 rounded-md transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/account/profile"
            className="mt-1 text-sm text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 px-3 py-2 -ml-3 rounded-md transition-colors"
          >
            Profile Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-1 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-2 -ml-3 rounded-md transition-colors w-full text-left"
          >
            Log Out
          </button>
        </div>
      </div>
    </Dropdown>
  );
};

export default UserProfileDropdown;
