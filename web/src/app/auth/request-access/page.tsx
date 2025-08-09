'use client';
import Card from 'components/ui/card';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IoBusinessOutline } from 'react-icons/io5';

function RequestAccess() {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [message, setMessage] = useState('');

  const companyId = searchParams.get('companyId');
  const companyName = searchParams.get('companyName');
  const companyDomain = searchParams.get('companyDomain');

  useEffect(() => {
    if (companyId && companyName) {
      setCompany({
        id: companyId,
        name: companyName,
        domain: companyDomain,
      });
    }
  }, [companyId, companyName, companyDomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: company.id,
          message: message,
          requestedRole: 'VIEWER', // Default to viewer role
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send access request');
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send access request',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // If no session, redirect to sign-in
  if (!session && typeof window !== 'undefined') {
    router.push('/sign-in');
    return null;
  }

  if (success) {
    return (
      <Card extra="w-[480px] mx-auto p-8">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <IoBusinessOutline className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            Request Sent!
          </h3>
          <p className="mb-6 text-base text-gray-600 dark:text-gray-400">
            Your access request has been sent to the administrators of{' '}
            {company?.name}. You'll receive an email notification once your
            request is reviewed.
          </p>
          <button
            onClick={() => router.push('/sign-in')}
            className="linear w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
          >
            Back to Sign In
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card extra="w-[480px] mx-auto p-8">
      <form onSubmit={handleSubmit}>
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <IoBusinessOutline className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            Request Access
          </h3>
          <p className="text-center text-base text-gray-600 dark:text-gray-400">
            {company?.name || 'Company'} already exists in our system. Request
            access from the company administrators.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Company
          </label>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <p className="font-semibold text-gray-900 dark:text-white">
              {company?.name}
            </p>
            {company?.domain && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {company.domain}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label
            htmlFor="message"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Message (optional)
          </label>
          <textarea
            id="message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message to the administrators..."
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="linear mt-4 w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
        >
          {isLoading ? 'Sending Request...' : 'Request Access'}
        </button>

        <div className="mt-6 text-center">
          <span className="text-sm font-medium text-navy-700 dark:text-gray-500">
            Changed your mind?
          </span>
          <button
            type="button"
            onClick={() => router.push('/sign-in')}
            className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-500 dark:text-white"
          >
            Back to Sign In
          </button>
        </div>
      </form>
    </Card>
  );
}

export default RequestAccess;
