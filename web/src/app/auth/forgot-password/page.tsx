'use client';
import Card from 'components/ui/card';
import InputField from 'components/ui/fields/InputField';
import Centered from 'components/auth/variants/CenteredAuthLayout';
import Link from 'next/link';
import { useState } from 'react';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setIsSuccess(true);
      } else {
        setMessage(data.message || 'Failed to send reset link');
        setIsSuccess(false);
      }
    } catch (err) {
      setMessage('Failed to send reset link. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Centered
      maincard={
        <Card extra="w-[480px] mx-auto p-8">
          <form onSubmit={handleSubmit}>
            <h3 className="mb-[10px] text-4xl font-bold text-gray-900 dark:text-white">
              Forgot Password
            </h3>
            <p className="mb-9 ml-1 text-base text-gray-600">
              Enter your email to receive a password reset link
            </p>

            {message && (
              <div className={`mb-4 rounded-lg p-3 text-sm ${
                isSuccess 
                  ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {message}
              </div>
            )}
            
            <InputField
              variant="auth"
              extra="mb-6"
              label="Email*"
              placeholder="mail@example.com"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            <button 
              type="submit"
              disabled={isLoading || isSuccess}
              className="linear mt-4 w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
            >
              {isLoading ? 'Sending...' : isSuccess ? 'Email Sent' : 'Send Reset Link'}
            </button>
            
            <div className="mt-6 text-center">
              <span className="text-sm font-medium text-navy-700 dark:text-gray-500">
                Remember your password?
              </span>
              <Link
                href="/auth/sign-in"
                className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-500 dark:text-white"
              >
                Sign In
              </Link>
            </div>
          </form>
        </Card>
      }
    />
  );
}

export default ForgotPassword;