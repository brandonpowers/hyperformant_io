'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from 'components/ui/card';
import Checkbox from 'components/ui/checkbox';
import { IoRocketOutline, IoTrendingUpOutline, IoAnalyticsOutline, IoPeopleOutline, IoGlobeOutline, IoBulbOutline } from 'react-icons/io5';

interface Goal {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const goals: Goal[] = [
  {
    id: 'market-intelligence',
    title: 'Market Intelligence',
    description: 'Track competitor vulnerabilities and customer sentiment',
    icon: <IoAnalyticsOutline className="h-6 w-6" />,
  },
  {
    id: 'growth-opportunities',
    title: 'Growth Opportunities',
    description: 'Identify M&A targets and expansion opportunities',
    icon: <IoTrendingUpOutline className="h-6 w-6" />,
  },
  {
    id: 'sales-automation',
    title: 'Sales Automation',
    description: 'Automate outreach and lead generation',
    icon: <IoRocketOutline className="h-6 w-6" />,
  },
  {
    id: 'team-collaboration',
    title: 'Team Collaboration',
    description: 'Improve team coordination and insights sharing',
    icon: <IoPeopleOutline className="h-6 w-6" />,
  },
  {
    id: 'global-expansion',
    title: 'Global Expansion',
    description: 'Analyze international markets and opportunities',
    icon: <IoGlobeOutline className="h-6 w-6" />,
  },
  {
    id: 'innovation-tracking',
    title: 'Innovation Tracking',
    description: 'Monitor industry trends and emerging technologies',
    icon: <IoBulbOutline className="h-6 w-6" />,
  },
];

export default function GoalsPage() {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Save goals to user preferences (you can implement this API endpoint)
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: selectedGoals }),
      });

      // Navigate to next step
      router.push('/onboarding/market');
    } catch (error) {
      console.error('Error saving goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
          What are your primary goals?
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Select all that apply. This helps us customize your experience.
        </p>
      </div>

      <div className="space-y-3">
        {goals.map((goal, index) => (
          <div
            key={goal.id}
            className="animate-fadeIn"
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'backwards',
            }}
          >
            <label
              htmlFor={goal.id}
              className="block cursor-pointer rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-brand-500 dark:border-gray-700 dark:hover:border-brand-500"
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  id={goal.id}
                  checked={selectedGoals.includes(goal.id)}
                  onCheckedChange={() => handleGoalToggle(goal.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="text-brand-500 dark:text-brand-400">
                      {goal.icon}
                    </div>
                    <h3 className="font-semibold text-navy-700 dark:text-white">
                      {goal.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {goal.description}
                  </p>
                </div>
              </div>
            </label>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={selectedGoals.length === 0 || isLoading}
          className="linear rounded-xl bg-brand-500 px-6 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-400 dark:hover:bg-brand-300"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
}