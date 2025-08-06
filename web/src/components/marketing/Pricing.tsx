'use client';
import React, { useState } from 'react';
import Card from 'components/ui/card';
import Link from 'next/link';

const Pricing = () => {
  const [activeButton, setActiveButton] = useState('monthly');

  return (
    <section id="pricing" className="py-20 px-4 bg-gray-50 dark:bg-navy-dark">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-navy-700 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Choose the plan that scales with your business. No hidden fees, no
            surprises.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="inline-flex h-[50px] w-[280px] items-center rounded-full bg-white dark:bg-navy-900 p-1.5 shadow-lg">
            <button
              className={`linear flex h-full w-1/2 cursor-pointer select-none items-center justify-center rounded-[20px] text-xs font-bold uppercase transition duration-200 ${
                activeButton === 'monthly'
                  ? 'bg-brand-500 text-white'
                  : 'bg-transparent text-gray-600 dark:text-gray-400'
              }`}
              onClick={() => setActiveButton('monthly')}
            >
              Monthly
            </button>
            <button
              className={`linear flex h-full w-1/2 cursor-pointer select-none items-center justify-center rounded-[20px] text-xs font-bold uppercase transition duration-200 ${
                activeButton === 'yearly'
                  ? 'bg-brand-500 text-white'
                  : 'bg-transparent text-gray-600 dark:text-gray-400'
              }`}
              onClick={() => setActiveButton('yearly')}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mx-auto max-w-6xl">
          {/* Starter Plan */}
          <Card extra="p-8 h-full">
            <h3 className="text-2xl font-bold text-navy-700 dark:text-white mb-2">
              Starter
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Perfect for early-stage SaaS companies
            </p>

            <div className="mb-6">
              <span className="text-5xl font-bold text-navy-700 dark:text-white">
                ${activeButton === 'monthly' ? '997' : '797'}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                /{activeButton === 'monthly' ? 'mo' : 'mo'}
              </span>
            </div>

            <Link
              href="/auth/sign-up"
              className="linear mb-6 block w-full rounded-xl bg-lightPrimary py-3 text-center font-medium text-brand-500 transition duration-200 hover:bg-gray-100 dark:bg-navy-700 dark:text-white dark:hover:bg-white/20"
            >
              Start Free
            </Link>

            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  2 Market Forces Reports/month
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Basic sentiment analysis
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Apollo.io integration (1k contacts)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Email support
                </span>
              </li>
            </ul>
          </Card>

          {/* Growth Plan - Most Popular */}
          <Card extra="p-8 h-full border-2 border-brand-500 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="rounded-full bg-brand-500 px-4 py-1 text-sm font-bold text-white">
                MOST POPULAR
              </div>
            </div>

            <h3 className="text-2xl font-bold text-navy-700 dark:text-white mb-2">
              Growth
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              For scaling SaaS companies
            </p>

            <div className="mb-6">
              <span className="text-5xl font-bold text-navy-700 dark:text-white">
                ${activeButton === 'monthly' ? '2,497' : '1,997'}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                /{activeButton === 'monthly' ? 'mo' : 'mo'}
              </span>
            </div>

            <Link
              href="/auth/sign-up"
              className="linear mb-6 block w-full rounded-xl bg-brand-500 py-3 text-center font-medium text-white transition duration-200 hover:bg-brand-600"
            >
              Start Free
            </Link>

            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  10 Market Forces Reports/month
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Advanced AI sentiment analysis
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Apollo.io integration (10k contacts)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  M&A prediction insights
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Priority support
                </span>
              </li>
            </ul>
          </Card>

          {/* Enterprise Plan */}
          <Card extra="p-8 h-full">
            <h3 className="text-2xl font-bold text-navy-700 dark:text-white mb-2">
              Enterprise
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              For market leaders
            </p>

            <div className="mb-6">
              <span className="text-5xl font-bold text-navy-700 dark:text-white">
                Custom
              </span>
            </div>

            <Link
              href="/auth/sign-up"
              className="linear mb-6 block w-full rounded-xl bg-lightPrimary py-3 text-center font-medium text-brand-500 transition duration-200 hover:bg-gray-100 dark:bg-navy-700 dark:text-white dark:hover:bg-white/20"
            >
              Contact Sales
            </Link>

            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Unlimited Market Forces Reports
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Custom AI model training
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Unlimited Apollo.io contacts
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Dedicated success manager
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  White-glove onboarding
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
