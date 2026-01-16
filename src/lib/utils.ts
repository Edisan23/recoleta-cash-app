import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseISO, isValid } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const names = name.split(' ');
  if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}


/**
 * Converts various date-like types to a JavaScript Date object.
 * Handles Firestore Timestamps, ISO strings, and existing Date objects.
 * @param value The date-like value to convert.
 * @returns A Date object or null if conversion fails.
 */
export function toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
        return value;
    }
    // Firestore Timestamp
    if (typeof value.toDate === 'function') {
        return value.toDate();
    }
    // ISO 8601 String
    if (typeof value === 'string') {
        const parsed = parseISO(value);
        if (isValid(parsed)) {
            return parsed;
        }
    }
     // Unix timestamp (milliseconds)
    if (typeof value === 'number') {
        return new Date(value);
    }
    return null;
}
