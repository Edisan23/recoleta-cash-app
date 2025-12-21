import { isSameDay, startOfDay, getDay } from 'date-fns';

export function isHoliday(date: Date, holidays: Date[]): boolean {
  // Check if it's Sunday (0 is Sunday for getDay)
  if (getDay(date) === 0) {
    return true;
  }
  const startOfDate = startOfDay(date);
  return holidays.some(holiday => isSameDay(startOfDate, holiday));
}
