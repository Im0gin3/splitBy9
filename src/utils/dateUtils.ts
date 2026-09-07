import { DayInfo, DayOfWeek } from '../types';

const DAYS_MAP: { key: DayOfWeek; name: string; shortName: string }[] = [
  { key: 'monday', name: 'Monday', shortName: 'Mon' },
  { key: 'tuesday', name: 'Tuesday', shortName: 'Tue' },
  { key: 'wednesday', name: 'Wednesday', shortName: 'Wed' },
  { key: 'thursday', name: 'Thursday', shortName: 'Thu' },
  { key: 'friday', name: 'Friday', shortName: 'Fri' },
  { key: 'saturday', name: 'Saturday', shortName: 'Sat' },
  { key: 'sunday', name: 'Sunday', shortName: 'Sun' },
];

/**
 * Returns the Monday date for a given week offset from today
 * offset = 0: current week
 * offset = -1: previous week
 * offset = 1: next week
 */
export function getMondayOfWeek(weekOffset: number = 0, baseDate: Date = new Date()): Date {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  // In ISO weeks, Monday is day 1. If today is Sunday (0), distance to Monday is -6.
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  d.setDate(d.getDate() + diffToMonday + (weekOffset * 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns ISO week ID like "2026-W37"
 */
export function getWeekId(mondayDate: Date): string {
  const target = new Date(mondayDate.valueOf());
  const dayNumber = (mondayDate.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = mondayDate.getFullYear();
  return `${year}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
}

/**
 * Parses an ISO week ID like "2026-W37" into its Monday Date object
 */
export function getMondayFromWeekId(weekId: string): Date {
  const parts = weekId.split('-W');
  if (parts.length !== 2) {
    return getMondayOfWeek(0);
  }
  const year = parseInt(parts[0], 10);
  const weekNum = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(weekNum)) {
    return getMondayOfWeek(0);
  }
  // Jan 4th is always in week 1 of ISO calendar
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7; // Monday = 0
  const week1Monday = new Date(year, 0, 4 - jan4Day);
  week1Monday.setHours(0, 0, 0, 0);
  const targetMonday = new Date(week1Monday.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
  targetMonday.setHours(0, 0, 0, 0);
  return targetMonday;
}

/**
 * Returns formatted date range for the week: "Sep 7 – Sep 13, 2026"
 */
export function formatWeekRange(mondayDate: Date): string {
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);

  const startMonth = mondayDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = mondayDate.getDate();
  const endMonth = sundayDate.toLocaleDateString('en-US', { month: 'short' });
  const endDay = sundayDate.getDate();
  const year = sundayDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

/**
 * Returns the 7 days of the week starting with Monday
 */
export function getDaysForWeek(mondayDate: Date): DayInfo[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayYear = today.getFullYear();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDay = String(today.getDate()).padStart(2, '0');
  const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

  return DAYS_MAP.map((d, index) => {
    const current = new Date(mondayDate);
    current.setDate(mondayDate.getDate() + index);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const displayDate = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const displayDayAndDate = `${d.shortName}, ${displayDate}`;
    const isToday = dateStr === todayStr;

    return {
      key: d.key,
      name: d.name,
      shortName: d.shortName,
      date: current,
      dateStr,
      displayDate,
      displayDayAndDate,
      isToday,
    };
  });
}
