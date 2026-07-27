import clsx, { type ClassValue } from 'clsx';

/**
 * Merge class names. Uses clsx for conditional composition.
 *
 * Note: when `tailwind-merge` is added to the project, swap the body to
 * `return twMerge(clsx(inputs));` to also de-duplicate conflicting Tailwind
 * utilities. clsx alone is sufficient for the current component set.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
