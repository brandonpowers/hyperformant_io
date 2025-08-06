'use client';
import Card from 'components/ui/card';
import VerificationCodeInput from 'components/ui/fields/VerificationCodeInput';
import Centered from 'components/auth/variants/CenteredAuthLayout';
import Link from 'next/link';
import { MdCheckCircle } from 'react-icons/md';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function Verification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [hasError, setHasError] = useState(false);

  const email = searchParams?.get('email');
  const registrationMessage = searchParams?.get('message');
  
  // Check if verification code is provided in URL (for future email link functionality)
  const urlCode = searchParams?.get('code');

  const handleCodeComplete = async (verificationCode: string) => {
    setCode(verificationCode);
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
        setMessage(data.message || 'Email verified successfully!');
        setIsSuccess(true);
        
        // Always attempt auto-login after successful verification
        if (data.autoLogin && email) {
          try {
            // Try to sign in using NextAuth
            // First, get the stored password or try without password (since email is now verified)
            let storedPassword = sessionStorage.getItem('temp_password');
            
            if (storedPassword) {
              // If we have stored password, use it
              const signInResult = await signIn('credentials', {
                email: email,
                password: storedPassword,
                redirect: false,
              });
              
              if (!signInResult?.error) {
                sessionStorage.removeItem('temp_password');
                router.push('/dashboard');
                return;
              }
            }
            
            // If stored password didn't work or doesn't exist, 
            // create a manual session redirect approach
            setMessage('Email verified successfully! Setting up your account...');
            setTimeout(() => {
              router.push('/onboarding/goals');
            }, 1500);
            
          } catch (signInError) {
            console.error('Auto sign-in failed:', signInError);
            // Fall back to sign-in page
            setTimeout(() => {
              router.push('/auth/sign-in?message=Email verified! Please sign in.');
            }, 2000);
          } finally {
            // Always clean up stored password
            sessionStorage.removeItem('temp_password');
          }
        } else {
          // Fallback: redirect to sign-in page
          setTimeout(() => {
            router.push('/auth/sign-in?message=Email verified! You can now sign in.');
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
    <Centered
      maincard={
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
                We've sent a verification code to {email ? email : 'your email address'}. Please enter the code below.
              </p>
            </div>

            {registrationMessage && !message && (
              <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                {registrationMessage}
              </div>
            )}

            {message && (
              <div className={`mb-4 rounded-lg p-3 text-sm ${
                isSuccess 
                  ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {message}
              </div>
            )}
            
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-navy-700 dark:text-white">
                Verification Code*
              </label>
              <VerificationCodeInput
                length={6}
                onComplete={handleCodeComplete}
                disabled={isLoading || isSuccess}
                error={hasError}
                initialValue={urlCode || ''}
              />
            </div>
            
            {isLoading && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 text-sm text-brand-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                  Verifying...
                </div>
              </div>
            )}
            
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
                href="/auth/sign-in"
                className="text-sm font-medium text-gray-600 hover:text-brand-500 dark:text-gray-400"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </Card>
      }
    />
  );
}

export default Verification;