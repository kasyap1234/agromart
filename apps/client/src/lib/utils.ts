// This file contains utility functions used throughout the app

/**
 * Applies a CSS class conditionally
 * @param classes Object mapping class names to boolean conditions
 * @returns Space-separated string of classes that meet their conditions
 */
export function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Merges multiple class names into a single string
 * @param inputs Class names to merge
 * @returns Combined class string
 */
export function cn(...inputs: (string | undefined)[]) {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}