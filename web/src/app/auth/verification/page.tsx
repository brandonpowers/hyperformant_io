'use client';
import Card from 'components/ui/card';
import VerificationCodeInput from 'components/ui/fields/VerificationCodeInput';
import Link from 'next/link';
import { MdCheckCircle } from 'react-icons/md';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

function Verification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = searchParams?.get('email');
  const registrationMessage = searchParams?.get('message');

  // Check if verification code is provided in URL (for future email link functionality)
  const urlCode = searchParams?.get('code');

  const handleCodeComplete = async (verificationCode: string) => {
    // Prevent multiple simultaneous submissions
    if (isSubmitting || isLoading || isSuccess) {
      return;
    }

    setIsSubmitting(true);
    setIsLoading(true);
    setMessage('');
    setHasError(false);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode, email }),
      });

      const data = await response.json();

      if (response.ok) {
        const successMessage = data.message.includes('already verified')
          ? 'Email already verified! Redirecting...'
          : 'Email verified successfully! Setting up your account...';

        setMessage(successMessage);
        setIsSuccess(true);

        try {
          // Update the session to reflect the new emailVerified status
          await updateSession();

          setMessage('Success! Redirecting to onboarding...');

          // Clean up stored password
          sessionStorage.removeItem('temp_password');

          // Small delay to show success message then redirect
          setTimeout(() => {
            router.push('/onboarding/goals');
          }, 1500);
        } catch (error) {
          console.error('Session update failed:', error);

          // Fallback: try manual sign-in if session update fails
          const storedPassword = sessionStorage.getItem('temp_password');
          if (storedPassword && email) {
            try {
              const signInResult = await signIn('credentials', {
                email: email,
                password: storedPassword,
                redirect: false,
              });

              if (signInResult?.ok && !signInResult?.error) {
                sessionStorage.removeItem('temp_password');
                router.push('/onboarding/goals');
                return;
              }
            } catch (signInError) {
              console.error('Fallback sign-in failed:', signInError);
            }
          }

          // Final fallback: redirect to sign-in
          sessionStorage.removeItem('temp_password');
          setTimeout(() => {
            router.push(
              '/sign-in?message=Email verified! Please sign in to continue.',
            );
          }, 2000);
        }
      } else {
        setMessage(data.message || 'Invalid verification code');
        setIsSuccess(false);
        setHasError(true);
      }
    } catch (err) {
      setMessage('Verification failed. Please try again.');
      setIsSuccess(false);
      setHasError(true);
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setMessage('Email address is required to resend code');
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setMessage(data.message);
    } catch (err) {
      setMessage('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card extra="w-[480px] mx-auto p-8">
      <div>
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <MdCheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Verify Your Email
          </h3>
          <p className="mt-2 text-center text-base text-gray-600">
            We've sent a verification code to{' '}
            {email ? email : 'your email address'}. Please enter the code below.
          </p>
        </div>

        {/* Show verification progress and messages in the same spot */}
        {(registrationMessage || message || isLoading) && (
          <div
            className={`mb-4 rounded-lg p-3 text-sm text-center ${
              isLoading
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                : isSuccess && message
                  ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                  : hasError && message
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400"></div>
                Verifying...
              </div>
            ) : message ? (
              message
            ) : (
              registrationMessage
            )}
          </div>
        )}

        <div className="mb-6">
          <VerificationCodeInput
            length={6}
            onComplete={handleCodeComplete}
            disabled={isLoading || isSuccess || isSubmitting}
            error={hasError}
            initialValue={urlCode || ''}
          />
        </div>


        <div className="mt-6 text-center">
          <span className="text-sm font-medium text-navy-700 dark:text-gray-500">
            Didn't receive the code?
          </span>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isResending || !email}
            className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-500 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
          >
            {isResending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>

        <div className="mt-3 text-center">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-gray-600 hover:text-brand-500 dark:text-gray-400"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default Verification;
