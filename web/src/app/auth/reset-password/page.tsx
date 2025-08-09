'use client';
import Card from 'components/ui/card';
import InputField from 'components/ui/fields/InputField';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const token = searchParams?.get('token');
  const email = searchParams?.get('email');

  useEffect(() => {
    // Redirect if no token or email
    if (!token || !email) {
      router.push('/forgot-password');
    }
  }, [token, email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      setIsSuccess(false);
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters');
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password reset successfully! Redirecting to sign in...');
        setIsSuccess(true);
        // Redirect to sign-in after 2 seconds
        setTimeout(() => {
          router.push(
            '/sign-in?message=Password reset successfully! You can now sign in.',
          );
        }, 2000);
      } else {
        setMessage(data.message || 'Failed to reset password');
        setIsSuccess(false);
      }
    } catch (err) {
      setMessage('Failed to reset password. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return null; // Will redirect in useEffect
  }

  return (
    <Card extra="w-[480px] mx-auto p-8">
      <form onSubmit={handleSubmit}>
        <h3 className="mb-[10px] text-4xl font-bold text-gray-900 dark:text-white">
          Reset Password
        </h3>
        <p className="mb-9 ml-1 text-base text-gray-600">
          Enter your new password below
        </p>

        {message && (
          <div
            className={`mb-4 rounded-lg p-3 text-sm ${
              isSuccess
                ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {message}
          </div>
        )}

        <InputField
          variant="auth"
          extra="mb-3"
          label=""
          placeholder="New Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <InputField
          variant="auth"
          extra="mb-6"
          label=""
          placeholder="Confirm Password"
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={isLoading || isSuccess}
          className="linear mt-4 w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
        >
          {isLoading
            ? 'Resetting...'
            : isSuccess
              ? 'Password Reset!'
              : 'Reset Password'}
        </button>

        <div className="mt-6 text-center">
          <span className="text-sm font-medium text-navy-700 dark:text-gray-500">
            Remember your password?
          </span>
          <Link
            href="/sign-in"
            className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-500 dark:text-white"
          >
            Sign In
          </Link>
        </div>
      </form>
    </Card>
  );
}

export default ResetPassword;
