import { MdNotifications } from 'react-icons/md';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import UserProfileDropdown from 'components/ui/UserProfileDropdown';
import logoDark from '/public/logos/logo-dark.svg';
import logoLight from '/public/logos/logo-light.svg';

const SiteHeader = () => {
  const [darkmode, setDarkmode] = React.useState(
    typeof document !== 'undefined'
      ? document.body.classList.contains('dark')
      : false,
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
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* User Profile Dropdown */}
          <UserProfileDropdown />
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
