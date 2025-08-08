import { Navigation } from 'components/marketing/Navigation';
import Footer from 'components/marketing/Footer';
import { ReactNode } from 'react';

interface LegalLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  lastUpdated: string;
}

export default function LegalLayout({
  children,
  title,
  subtitle,
  lastUpdated,
}: LegalLayoutProps) {
  return (
    <>
      <Navigation />
      <main className="flex flex-col overflow-hidden">
        <div className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="mx-auto max-w-4xl px-6 py-24 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                  {subtitle}
                </p>
              )}
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800">
          <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
            <div className="prose prose-lg prose-gray max-w-none dark:prose-invert">
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
