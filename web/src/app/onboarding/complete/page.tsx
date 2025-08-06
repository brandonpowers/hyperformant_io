'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IoCheckmarkCircle, IoRocket, IoDocumentText, IoAnalytics } from 'react-icons/io5';
import Link from 'next/link';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  href: string;
}

const features: Feature[] = [
  {
    icon: <IoAnalytics className="h-8 w-8" />,
    title: 'View Analytics Dashboard',
    description: 'See real-time insights about your market and competitors',
    action: 'Go to Dashboard',
    href: '/dashboard',
  },
  {
    icon: <IoDocumentText className="h-8 w-8" />,
    title: 'Generate Your First Report',
    description: 'Create a Market Forces Analysis for any company',
    action: 'Create Report',
    href: '/dashboard/reports/new',
  },
  {
    icon: <IoRocket className="h-8 w-8" />,
    title: 'Set Up Automation',
    description: 'Configure automated outreach and lead generation',
    action: 'Configure',
    href: '/dashboard/automation',
  },
];

export default function CompletePage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="text-center">
      <div className="mb-8 flex justify-center">
        <div className="animate-bounce">
          <IoCheckmarkCircle className="h-20 w-20 text-green-500" />
        </div>
      </div>

      <h1 className="mb-4 text-3xl font-bold text-navy-700 dark:text-white">
        You're all set!
      </h1>
      <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
        Your account is ready. Redirecting to dashboard in {countdown} seconds...
      </p>

      <div className="mb-8 space-y-4">
        <h2 className="mb-4 text-xl font-semibold text-navy-700 dark:text-white">
          Get started with these actions:
        </h2>
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="animate-fadeIn rounded-lg border border-gray-200 p-6 text-left transition-all hover:border-brand-500 dark:border-gray-700 dark:hover:border-brand-500"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'backwards',
            }}
          >
            <div className="flex items-start gap-4">
              <div className="text-brand-500 dark:text-brand-400">
                {feature.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-navy-700 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
              <Link
                href={feature.href}
                className="linear rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-300"
              >
                {feature.action}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard"
        className="linear inline-block rounded-xl bg-brand-500 px-8 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 dark:bg-brand-400 dark:hover:bg-brand-300"
      >
        Go to Dashboard Now
      </Link>
    </div>
  );
}