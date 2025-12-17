import { isSameDay, startOfDay } from 'date-fns';

export function isHoliday(date: Date, holidays: Date[]): boolean {
  const startOfDate = startOfDay(date);
  return holidays.some(holiday => isSameDay(startOfDate, holiday));
}
