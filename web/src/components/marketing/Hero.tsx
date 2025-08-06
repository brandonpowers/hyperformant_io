'use client';
import { RiPlayCircleFill } from '@remixicon/react';
import Link from 'next/link';
import { Button } from '../ui/Button';

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="mt-32 flex flex-col items-center justify-center text-center sm:mt-40"
    >
      <h1
        id="hero-title"
        className="inline-block animate-slide-up-fade bg-gradient-to-br from-gray-900 to-gray-800 bg-clip-text p-2 text-4xl font-bold tracking-tighter text-transparent sm:text-6xl md:text-7xl dark:from-gray-50 dark:to-gray-300"
        style={{ animationDuration: '700ms' }}
      >
        AI-Powered Market <br /> Intelligence Platform
      </h1>
      <p
        className="mt-6 max-w-lg animate-slide-up-fade text-lg text-gray-700 dark:text-gray-400"
        style={{ animationDuration: '900ms' }}
      >
        Transform your business with Market Forces Analysis. Discover competitor
        vulnerabilities, predict market disruptions, and accelerate revenue
        growth with AI-driven insights.
      </p>
      <div
        className="mt-8 flex w-full animate-slide-up-fade flex-col justify-center gap-3 px-3 sm:flex-row"
        style={{ animationDuration: '1100ms' }}
      >
        <Button className="h-10 font-semibold" asChild href="/auth/sign-up">
          Start Free
        </Button>
        <Button
          asChild
          variant="ghost"
          className="group h-10 gap-x-2 font-semibold border-none shadow-none"
        >
          <Link href="#demo" className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-gray-50 transition-all group-hover:bg-gray-200 dark:bg-gray-800 dark:group-hover:bg-gray-700">
              <RiPlayCircleFill
                aria-hidden="true"
                className="size-5 shrink-0 text-gray-900 dark:text-gray-50"
              />
            </span>
            <span>Watch demo</span>
          </Link>
        </Button>
      </div>

      {/* Hero Image */}
      <div
        className="relative mx-auto ml-3 mt-20 h-fit w-[40rem] max-w-6xl animate-slide-up-fade sm:ml-auto sm:w-full sm:px-2"
        style={{ animationDuration: '1400ms' }}
      >
        <div className="flow-root">
          <div className="rounded-2xl bg-slate-50/40 p-2 ring-1 ring-inset ring-slate-200/50 dark:bg-gray-900/70 dark:ring-white/10">
            <div className="rounded-xl bg-white ring-1 ring-slate-900/5 dark:bg-slate-950 dark:ring-white/15">
              <div className="rounded-xl shadow-2xl dark:shadow-indigo-600/10 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 h-80 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Market Forces Analysis
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    AI-powered competitive intelligence dashboard
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="absolute inset-x-0 -bottom-20 -mx-10 h-2/4 bg-gradient-to-t from-white via-white to-transparent lg:h-1/4 dark:from-gray-950 dark:via-gray-950"
          aria-hidden="true"
        />
      </div>

      {/* Trust indicators */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-500">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>24-hour report delivery</span>
        </div>
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>No credit card required</span>
        </div>
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Cancel anytime</span>
        </div>
      </div>
    </section>
  );
}
