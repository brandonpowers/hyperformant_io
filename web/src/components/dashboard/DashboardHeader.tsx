import { MdNotifications, MdSettings } from 'react-icons/md';
import { useSession, signOut } from 'next-auth/react';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Dropdown from 'components/ui/dropdown';
import logoDark from '/public/logos/logo-dark.svg';
import logoLight from '/public/logos/logo-light.svg';

const SiteHeader = () => {
  const { data: session } = useSession();
  const [darkmode, setDarkmode] = React.useState(
    typeof document !== 'undefined' ? document.body.classList.contains('dark') : false,
  );
  
  return (
    <header className="w-full bg-white dark:bg-navy-800 shadow-sm border-b border-gray-200 dark:border-navy-700 z-50">
      <div className="flex items-center justify-between px-6 py-6">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center">
            <Image
              src={logoLight}
              alt="Logo"
              width={120}
              height={40}
              className="h-8 w-auto dark:hidden"
            />
            <Image
              src={logoDark}
              alt="Logo"
              width={120}
              height={40}
              className="hidden h-8 w-auto dark:block"
            />
          </Link>
        </div>


        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            <MdNotifications className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            className="flex cursor-pointer items-center justify-center rounded-lg bg-gray-100 p-2 text-gray-700 transition duration-200 hover:bg-gray-200 dark:bg-navy-700 dark:text-yellow-500 dark:hover:bg-navy-600"
            onClick={() => {
              if (darkmode) {
                document.body.classList.remove('dark');
                setDarkmode(false);
              } else {
                document.body.classList.add('dark');
                setDarkmode(true);
              }
            }}
          >
            {darkmode ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* User Profile Dropdown */}
          <Dropdown
            button={
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {session?.user?.email}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {session?.user?.name?.[0] || 'U'}
                  </span>
                </div>
              </div>
            }
            classNames={'py-2 top-14 right-0 w-max'}
          >
            <div className="flex h-max w-56 flex-col justify-start rounded-[20px] bg-white bg-cover bg-no-repeat pb-4 shadow-xl shadow-shadow-500 dark:!bg-navy-700 dark:text-white dark:shadow-none">
              <div className="ml-4 mt-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-navy-700 dark:text-white">
                    👋 Hey, {session?.user?.name || 'User'}
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
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;