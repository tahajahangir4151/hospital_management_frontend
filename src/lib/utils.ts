/**
 * Simple, dependency-free class name concatenation utility.
 * Filters out falsy values and joins classes with a space.
 */
export function cn(...classes: Array<string | undefined | null | false | 0>): string {
  return classes.filter(Boolean).join(" ");
}
