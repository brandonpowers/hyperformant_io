'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const revenueRanges = [
  { value: 'startup', label: 'Startup ($0 - $1M)' },
  { value: 'growth', label: 'Growth ($1M - $10M)' },
  { value: 'scale', label: 'Scale ($10M - $50M)' },
  { value: 'enterprise', label: 'Enterprise ($50M+)' },
];

const industries = [
  { value: 'saas', label: 'SaaS' },
  { value: 'fintech', label: 'FinTech' },
  { value: 'healthtech', label: 'HealthTech' },
  { value: 'edtech', label: 'EdTech' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'other', label: 'Other' },
];

export default function MarketPage() {
  const [selectedRevenue, setSelectedRevenue] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleIndustryToggle = (industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((i) => i !== industry)
        : [...prev, industry]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Save market preferences
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetRevenue: selectedRevenue,
          targetIndustries: selectedIndustries 
        }),
      });

      // Navigate to final step
      router.push('/onboarding/complete');
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
          Define your target market
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Tell us about the companies you want to target.
        </p>
      </div>

      <div className="space-y-8">
        {/* Revenue Range */}
        <div>
          <h3 className="mb-4 font-semibold text-navy-700 dark:text-white">
            Target Company Revenue
          </h3>
          <div className="space-y-2">
            {revenueRanges.map((range, index) => (
              <div
                key={range.value}
                className="animate-fadeIn"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <label className="flex cursor-pointer items-center rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-brand-500 dark:border-gray-700 dark:hover:border-brand-500">
                  <input
                    type="radio"
                    name="revenue"
                    value={range.value}
                    checked={selectedRevenue === range.value}
                    onChange={(e) => setSelectedRevenue(e.target.value)}
                    className="h-4 w-4 border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="ml-3 text-navy-700 dark:text-white">
                    {range.label}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Industries */}
        <div>
          <h3 className="mb-4 font-semibold text-navy-700 dark:text-white">
            Target Industries
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {industries.map((industry, index) => (
              <div
                key={industry.value}
                className="animate-fadeIn"
                style={{
                  animationDelay: `${(index + 4) * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <label className="flex cursor-pointer items-center rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-brand-500 dark:border-gray-700 dark:hover:border-brand-500">
                  <input
                    type="checkbox"
                    value={industry.value}
                    checked={selectedIndustries.includes(industry.value)}
                    onChange={() => handleIndustryToggle(industry.value)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="ml-3 text-navy-700 dark:text-white">
                    {industry.label}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Link
          href="/onboarding/goals"
          className="linear rounded-xl border-2 border-gray-200 px-6 py-3 text-base font-medium text-navy-700 transition duration-200 hover:border-gray-300 dark:border-gray-700 dark:text-white dark:hover:border-gray-600"
        >
          Back
        </Link>
        <button
          type="submit"
          disabled={!selectedRevenue || selectedIndustries.length === 0 || isLoading}
          className="linear rounded-xl bg-brand-500 px-6 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-400 dark:hover:bg-brand-300"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
}