import React from 'react';
import Link from 'next/link';
import { cx, focusRing } from 'lib/utils';

interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary' | 'light' | 'ghost';
  asChild?: boolean;
  href?: string;
}

const buttonVariants = {
  primary: [
    'border-transparent',
    'text-white dark:text-white',
    'bg-indigo-600 dark:bg-indigo-500',
    'hover:bg-indigo-700 dark:hover:bg-indigo-400',
    'disabled:bg-indigo-100 disabled:text-indigo-400',
    'disabled:dark:bg-indigo-800 disabled:dark:text-indigo-600',
  ],
  secondary: [
    'border-gray-300 dark:border-gray-800',
    'text-gray-900 dark:text-gray-50',
    'bg-white dark:bg-gray-950',
    'hover:bg-gray-50 dark:hover:bg-gray-900/60',
    'disabled:text-gray-400',
    'disabled:dark:text-gray-600',
  ],
  light: [
    'shadow-none',
    'border-transparent',
    'text-gray-900 dark:text-gray-50',
    'bg-gray-200 dark:bg-gray-900',
    'hover:bg-gray-300/70 dark:hover:bg-gray-800/80',
    'disabled:bg-gray-100 disabled:text-gray-400',
    'disabled:dark:bg-gray-800 disabled:dark:text-gray-600',
  ],
  ghost: [
    'shadow-none',
    'border-transparent',
    'text-gray-900 dark:text-gray-50',
    'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800/80',
    'disabled:text-gray-400',
    'disabled:dark:text-gray-600',
  ],
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', className, children, asChild, href, ...props },
    forwardedRef,
  ) => {
    const baseClasses = [
      'relative inline-flex items-center justify-center whitespace-nowrap rounded-lg border px-3 py-2 text-center text-sm font-medium shadow-sm transition-all duration-100 ease-in-out',
      'disabled:pointer-events-none disabled:shadow-none',
      ...focusRing,
      ...buttonVariants[variant],
    ];

    if (asChild && href) {
      return (
        <Link href={href} className={cx(baseClasses, className)}>
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={forwardedRef}
        className={cx(baseClasses, className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
