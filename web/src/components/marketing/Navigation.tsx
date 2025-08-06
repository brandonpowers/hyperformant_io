'use client';

import useScroll from 'lib/use-scroll';
import { cx } from 'lib/utils';
import Link from 'next/link';
import React from 'react';
import { Button } from '../ui/Button';
import Image from 'next/image';
import logoDark from '/public/logos/logo-dark.svg';
import logoLight from '/public/logos/logo-light.svg';
import { useSession } from 'next-auth/react';
import UserProfileDropdown from '../ui/UserProfileDropdown';

export function Navigation() {
  const scrolled = useScroll(15);
  const { data: session } = useSession();

  return (
    <header
      className={cx(
        'fixed inset-x-3 top-4 z-50 mx-auto flex h-16 max-w-6xl transform-gpu animate-slide-down-fade justify-center overflow-visible rounded-xl px-3 py-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1.03)] will-change-transform',
        scrolled
          ? 'backdrop-blur-nav max-w-3xl border border-gray-100 bg-white/80 shadow-xl dark:border-white/15 dark:bg-black/70'
          : 'bg-white/0 dark:bg-gray-950/0',
      )}
    >
      <div className="w-full md:my-auto">
        <div className="relative flex items-center justify-between">
          <Link href="/" aria-label="Home">
            <span className="sr-only">Hyperformant logo</span>
            <Image
              src={logoLight}
              alt="Hyperformant"
              width={120}
              height={40}
              className="h-8 w-auto dark:hidden"
            />
            <Image
              src={logoDark}
              alt="Hyperformant"
              width={120}
              height={40}
              className="hidden h-8 w-auto dark:block"
            />
          </Link>
          {/* Navigation links hidden for now */}
          {session ? (
            <div className="hidden items-center gap-4 md:flex">
              <UserProfileDropdown />
            </div>
          ) : (
            <div className="hidden items-center gap-4 md:flex">
              <Link
                href="/auth/sign-in"
                className="px-2 py-1 font-medium text-gray-900 hover:text-gray-700 dark:text-gray-50 dark:hover:text-gray-200"
              >
                Log In
              </Link>
              <Button
                className="h-10 font-semibold"
                asChild
                href="/auth/sign-up"
              >
                Start Free
              </Button>
            </div>
          )}
          {!session && (
            <div className="flex gap-x-2 md:hidden">
              <Button asChild href="/auth/sign-up">
                Start Free
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
