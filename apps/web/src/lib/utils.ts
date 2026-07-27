/**
 * Merge class names — a dependency-free implementation of the common `cn()`
 * helper. Accepts strings, numbers, arrays, and conditional objects
 * (`{ 'text-red-500': hasError }`), mirroring clsx's API, so components can
 * compose classes conditionally and always forward `className`.
 *
 * Kept dependency-free on purpose so the web build never breaks on a missing
 * package. If `tailwind-merge` is later added, wrap the return in `twMerge(...)`
 * to also de-duplicate conflicting Tailwind utilities.
 */
type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

export type { ClassValue };

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const walk = (value: ClassValue): void => {
    if (!value) return;
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value === 'object') {
      for (const key in value) {
        if (value[key]) out.push(key);
      }
    }
  };

  for (const input of inputs) walk(input);
  return out.join(' ');
}
