'use client';
import Card from 'components/ui/card';
import InputField from 'components/ui/fields/InputField';
import Centered from 'components/auth/variants/CenteredAuthLayout';
import UserAvatar from 'components/ui/avatar/UserAvatar';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

function Lock() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle redirect after mounting
  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/auth/sign-in');
    }
  }, [mounted, status, router]);

  // Get user info from session or use defaults
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: userEmail,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid password');
      } else {
        // Successful unlock - redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Unlock failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state during authentication check
  if (!mounted || status === 'loading') {
    return (
      <Centered
        maincard={
          <Card extra="w-[480px] mx-auto p-8">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          </Card>
        }
      />
    );
  }

  // Don't render anything if redirecting
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <Centered
      maincard={
        <Card extra="w-[480px] mx-auto p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6 flex flex-col items-center">
              <UserAvatar size="xl" />
              <h3 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                Hi, {userName}
              </h3>
              <p className="text-base text-gray-600">
                Enter your password to unlock
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <InputField
              variant="auth"
              extra="mb-6"
              label=""
              placeholder="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="linear mt-4 w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
            >
              {isLoading ? 'Unlocking...' : 'Unlock'}
            </button>

            <div className="mt-6 text-center">
              <span className="text-sm font-medium text-navy-700 dark:text-gray-500">
                Not your account?
              </span>
              <Link
                href="/auth/sign-in"
                className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-500 dark:text-white"
              >
                Sign in with different account
              </Link>
            </div>
          </form>
        </Card>
      }
    />
  );
}

export default Lock;
