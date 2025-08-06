'use client';
import Card from 'components/ui/card';
import InputField from 'components/ui/fields/InputField';
import Centered from 'components/auth/variants/CenteredAuthLayout';
import { FcGoogle } from 'react-icons/fc';
import { SiMicrosoft } from 'react-icons/si';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function SignInDefault() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for success message from registration
  const message = searchParams?.get('message');

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
      // Clear error when user starts typing
      if (error) setError('');
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // Check if this is a verification error
        if (
          result.error.includes('verify') ||
          result.error === 'CredentialsSignin'
        ) {
          // Try to determine if it's a verification issue by checking the specific error
          // For now, we'll create a separate API call to check verification status
          try {
            const checkResponse = await fetch('/api/auth/check-verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email }),
            });

            const checkData = await checkResponse.json();

            if (checkData.needsVerification) {
              // Store password temporarily for auto-login after verification
              sessionStorage.setItem('temp_password', formData.password);

              // Redirect to verification page with email pre-filled
              router.push(
                `/auth/verification?email=${encodeURIComponent(formData.email)}&message=${encodeURIComponent("Please verify your email address. We've sent you a new verification code.")}`,
              );
              return;
            }
          } catch (checkError) {
            console.error('Failed to check verification status:', checkError);
          }
        }

        setError('Invalid email or password');
      } else {
        // Successful sign in - redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('Google sign in failed. Please try again.');
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      await signIn('microsoft', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('Microsoft sign in failed. Please try again.');
    }
  };

  return (
    <Centered
      maincard={
        <Card extra="w-[480px] mx-auto p-8">
          <form onSubmit={handleSubmit}>
            <h3 className="mb-[10px] text-4xl font-bold text-gray-900 dark:text-white">
              Sign In
            </h3>

            {message && (
              <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
                {message}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="mt-9">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="mb-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-lightPrimary hover:bg-gray-100 dark:bg-navy-700 dark:hover:bg-navy-600 dark:text-white transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="rounded-full text-xl">
                  <FcGoogle />
                </div>
                <p className="text-sm font-medium text-navy-700 dark:text-white">
                  Sign In with Google
                </p>
              </button>
              <button
                type="button"
                onClick={handleMicrosoftSignIn}
                disabled={isLoading}
                className="mb-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-lightPrimary hover:bg-gray-100 dark:bg-navy-700 dark:hover:bg-navy-600 dark:text-white transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="rounded-full text-xl text-blue-600">
                  <SiMicrosoft />
                </div>
                <p className="text-sm font-medium text-navy-700 dark:text-white">
                  Sign In with Microsoft
                </p>
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px w-full bg-gray-200 dark:!bg-navy-700" />
              <p className="text-base font-medium text-gray-600"> or </p>
              <div className="h-px w-full bg-gray-200 dark:!bg-navy-700" />
            </div>
            <InputField
              variant="auth"
              extra="mb-3"
              label="Email*"
              placeholder="mail@simmmple.com"
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
            />
            <InputField
              variant="auth"
              extra="mb-3"
              label="Password*"
              placeholder="Min. 8 characters"
              id="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
            />
            <div className="mt-2 flex items-center justify-between px-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 text-sm font-medium text-navy-700 dark:text-white"
                >
                  Keep me logged In
                </label>
              </div>
              <a
                className="text-sm font-medium text-brand-500 hover:text-brand-500 dark:text-white"
                href="/auth/forgot-password"
              >
                Forgot password?
              </a>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="linear mt-4 w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="mt-3">
              <a
                href="/auth/sign-up"
                className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-500 dark:text-white"
              >
                Create an Account
              </a>
            </div>
          </form>
        </Card>
      }
    />
  );
}

export default SignInDefault;
