import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Alias for consistency with Tremor template
export const cx = cn;

// Focus ring utility for accessibility
export const focusRing = [
  // base
  "outline outline-0 outline-offset-2",
  // outline color
  "outline-blue-500 dark:outline-blue-500",
  // focus-visible
  "focus-visible:outline-2",
];

// Input focus styles
export const focusInput = [
  // base
  "focus:outline-none",
  // border color
  "focus:border-blue-500 dark:focus:border-blue-500",
  // ring
  "focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/20",
];

// Input error styles
export const hasErrorInput = [
  // border color
  "border-red-500 dark:border-red-500",
  // ring
  "ring-2 ring-red-200 dark:ring-red-400/20",
];