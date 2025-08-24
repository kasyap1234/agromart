import { cva } from "class-variance-authority";

export const statsCardVariants = cva(
  "w-12 h-12 flex items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm group-hover:shadow-md",
  {
    variants: {
      color: {
        primary: "text-primary-600 bg-gradient-to-br from-primary-100 to-primary-200 dark:text-primary-400 dark:from-primary-900/50 dark:to-primary-800/50 border-primary-200 dark:border-primary-800/50",
        secondary: "text-secondary-600 bg-gradient-to-br from-secondary-100 to-secondary-200 dark:text-secondary-400 dark:from-secondary-900/50 dark:to-secondary-800/50 border-secondary-200 dark:border-secondary-800/50",
        success: "text-green-600 bg-gradient-to-br from-green-100 to-green-200 dark:text-green-400 dark:from-green-900/50 dark:to-green-800/50 border-green-200 dark:border-green-800/50",
        warning: "text-orange-600 bg-gradient-to-br from-orange-100 to-orange-200 dark:text-orange-400 dark:from-orange-900/50 dark:to-orange-800/50 border-orange-200 dark:border-orange-800/50",
        error: "text-red-600 bg-gradient-to-br from-red-100 to-red-200 dark:text-red-400 dark:from-red-900/50 dark:to-red-800/50 border-red-200 dark:border-red-800/50",
      },
    },
    defaultVariants: {
      color: "primary",
    },
  }
);