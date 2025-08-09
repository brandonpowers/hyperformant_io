'use client';
import Card from 'components/ui/card';
import Link from 'next/link';
import InputField from 'components/ui/fields/InputField';
import { FcGoogle } from 'react-icons/fc';
import { SiMicrosoft } from 'react-icons/si';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function SignUpDefault() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

    if (!agreedToTerms) {
      setError('Please agree to the Terms and Conditions');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Registration successful - check if user needs to request access
      if (data.needsAccessRequest && data.company) {
        // User needs to request access to existing company
        const params = new URLSearchParams({
          companyId: data.company.id,
          companyName: data.company.name,
          companyDomain: data.company.domain || '',
        });
        router.push(`/auth/request-access?${params.toString()}`);
      } else if (data.requiresVerification) {
        // Store password for auto-login after verification
        sessionStorage.setItem('temp_password', formData.password);

        // Create session immediately (user exists but not verified)
        try {
          await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false,
          });
        } catch (err) {
          // If sign-in fails, continue to verification anyway
          console.log('Initial sign-in failed:', err);
        }

        // Normal verification flow
        router.push(
          `/auth/verification?email=${encodeURIComponent(formData.email)}&message=${encodeURIComponent(data.message)}`,
        );
      } else {
        router.push(`/sign-in?message=${encodeURIComponent(data.message)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('Google sign up failed. Please try again.');
    }
  };

  const handleMicrosoftSignUp = async () => {
    try {
      await signIn('microsoft', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('Microsoft sign up failed. Please try again.');
    }
  };

  return (
    <Card extra="w-[480px] mx-auto p-8">
      <form onSubmit={handleSubmit}>
        <h3 className="text-4xl font-bold text-navy-700 dark:text-white">
          Sign Up
        </h3>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="mt-9">
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className="mb-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-lightPrimary hover:bg-gray-100 dark:bg-navy-700 dark:hover:bg-navy-600 dark:text-white transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="rounded-full text-xl">
              <FcGoogle />
            </div>
            <p className="text-sm font-medium text-navy-700 dark:text-white">
              Sign Up with Google
            </p>
          </button>
          <button
            type="button"
            onClick={handleMicrosoftSignUp}
            disabled={isLoading}
            className="mb-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-lightPrimary hover:bg-gray-100 dark:bg-navy-700 dark:hover:bg-navy-600 dark:text-white transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="rounded-full text-xl text-blue-600">
              <SiMicrosoft />
            </div>
            <p className="text-sm font-medium text-navy-700 dark:text-white">
              Sign Up with Microsoft
            </p>
          </button>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px w-full bg-gray-200 dark:!bg-navy-700" />
          <p className="text-base font-medium text-gray-600"> or </p>
          <div className="h-px w-full bg-gray-200 dark:!bg-navy-700" />
        </div>
        {/* user info */}
        <div className="mb-3 flex w-full items-center justify-center gap-4">
          <div className="w-1/2">
            <InputField
              variant="auth"
              extra="mb-3"
              label=""
              placeholder="First name"
              id="firstname"
              type="text"
              value={formData.firstName}
              onChange={handleInputChange('firstName')}
            />
          </div>

          <div className="w-1/2">
            <InputField
              variant="auth"
              extra="mb-3"
              label=""
              placeholder="Last name"
              id="lastname"
              type="text"
              value={formData.lastName}
              onChange={handleInputChange('lastName')}
            />
          </div>
        </div>
        {/* Email */}
        <InputField
          variant="auth"
          extra="mb-3"
          label=""
          placeholder="Email"
          id="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
        />
        {/* Password */}
        <InputField
          variant="auth"
          extra="mb-3"
          label=""
          placeholder="Password"
          id="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange('password')}
        />
        {/* Checkbox */}
        <div className="mt-2 flex items-center justify-between px-2">
          <div className="flex">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <label
              htmlFor="terms"
              className="ml-2 text-sm font-medium text-navy-700 dark:text-white"
            >
              Agree to our simple, transparent
              <Link
                href="/terms"
                className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-500 dark:text-white"
              >
                terms
              </Link>
              .
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="linear mt-4 w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
        >
          {isLoading ? 'Creating account...' : 'Create my account'}
        </button>

        <div className="mt-3">
          <span className="text-sm font-medium text-navy-700 dark:text-gray-500">
            Already a member?
          </span>
          <a
            href="/sign-in"
            className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-500 dark:text-white"
          >
            Sign In
          </a>
        </div>
      </form>
    </Card>
  );
}

export default SignUpDefault;
