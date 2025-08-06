'use client';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from 'components/ui/card';
import { cx } from 'lib/utils';
import Link from 'next/link';
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
                : 'bg-gray-300 dark:bg-gray-700',
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

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!session) {
      router.push('/auth/sign-in');
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 transition-all md:px-6 dark:border-gray-800 dark:bg-navy-900">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-navy-700 dark:text-white">
            Welcome to Hyperformant
          </h2>
        </div>
        <StepProgress steps={steps} />
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          Skip to dashboard
        </Link>
      </header>
      <main className="mx-auto mb-20 mt-24 max-w-2xl px-4">
        <Card extra="p-6 md:p-8">{children}</Card>
      </main>
    </div>
  );
};

export default OnboardingLayout;
