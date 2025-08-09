'use client';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from 'components/ui/card';
import { cx } from 'lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import logoDark from '/public/logos/logo-dark.svg';
import logoLight from '/public/logos/logo-light.svg';
import '../../styles/dashboard.css';

interface Step {
  name: string;
  href: string;
}

const steps: Step[] = [
  { name: 'Company Goals', href: '/onboarding/goals' },
  { name: 'Target Market', href: '/onboarding/market' },
  { name: 'Setup Complete', href: '/onboarding/complete' },
];

interface StepProgressProps {
  steps: Step[];
}

const StepProgress = ({ steps }: StepProgressProps) => {
  const pathname = usePathname();
  const currentStepIndex = steps.findIndex((step) =>
    pathname.startsWith(step.href),
  );

  return (
    <div aria-label="Onboarding progress">
      <ol className="mx-auto flex w-24 flex-nowrap gap-1 md:w-fit">
        {steps.map((step, index) => (
          <li
            key={step.name}
            className={cx(
              'h-1 w-12 rounded-full transition-colors duration-300',
              index <= currentStepIndex
                ? 'bg-brand-500'
                : 'bg-gray-400 dark:bg-gray-700',
            )}
          >
            <span className="sr-only">
              {step.name}{' '}
              {index < currentStepIndex
                ? 'completed'
                : index === currentStepIndex
                  ? 'current'
                  : ''}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

const OnboardingLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!session) {
      router.push('/sign-in');
    }
  }, [session, router]);

  // Handle scroll effect for glass background
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col self-center justify-self-center bg-gradient-main">
      <div
        className={`fixed top-0 z-50 flex h-[84px] w-full items-center justify-between px-4 transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'bg-white/80 backdrop-blur-md shadow-lg dark:bg-navy-900/80'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex w-full max-w-screen-xl items-center relative">
          {/* Logo */}
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
          
          {/* Progress indicator in center - absolutely positioned */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <StepProgress steps={steps} />
          </div>
          
          {/* Skip to dashboard link */}
          <Link
            href="/dashboard"
            className="text-sm font-medium text-brand-500 hover:text-gray-200 ml-auto"
          >
            Skip to dashboard
          </Link>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="mx-auto mb-20 mt-24 max-w-2xl px-4">
          <Card extra="p-6 md:p-8">{children}</Card>
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
