import { DayInfo, DayOfWeek, MealEntry, MealType } from '../types';

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
  const weekId = getWeekId(mondayDate);

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
      weekId,
    };
  });
}

/**
 * Returns 14 days starting from current week's Monday through Sunday of the next week
 */
export function getTwoWeeksDays(baseMonday: Date = getMondayOfWeek(0)): DayInfo[] {
  const currentWeek = getDaysForWeek(baseMonday);
  const nextMonday = new Date(baseMonday);
  nextMonday.setDate(baseMonday.getDate() + 7);
  const nextWeek = getDaysForWeek(nextMonday);
  return [...currentWeek, ...nextWeek];
}

export interface UpcomingMealResult {
  title: string;
  mealTypeLabel: string;
  dateDisplay: string;
  meal: MealEntry;
}

/**
 * Returns IST (Asia/Kolkata) date components and minutes from midnight
 */
export function getISTDateInfo(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const year = parseInt(get('year'), 10);
  const month = parseInt(get('month'), 10);
  const day = parseInt(get('day'), 10);
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(get('minute'), 10);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const timeMinutes = hour * 60 + minute;

  return { dateStr, hour, minute, timeMinutes, year, month, day };
}

/**
 * Determines the next upcoming confirmed meal based on India Standard Time (IST).
 * 
 * Meal periods:
 * - 1:00 AM through 1:00 PM -> Breakfast/Lunch
 * - 1:01 PM through 12:59 AM -> Dinner
 * 
 * At any given moment, determines the next confirmed meal chronologically.
 * If the relevant meal period for today has already passed, or there is no confirmed
 * meal for that period, moves forward to the next confirmed meal.
 */
export function getUpcomingMeal(
  meals: MealEntry[],
  now: Date = new Date()
): UpcomingMealResult | null {
  if (!meals || meals.length === 0) {
    return null;
  }

  const ist = getISTDateInfo(now);
  const candidates: { dateStr: string; mealType: MealType; dateObj: Date }[] = [];
  const baseDate = new Date(`${ist.dateStr}T12:00:00Z`);

  // 1:00 AM (60 min) through 1:00 PM (780 min) -> Breakfast/Lunch period
  // 1:01 PM (781 min) through 12:59 AM (59 min) -> Dinner period
  if (ist.timeMinutes < 60) {
    // 00:00 to 00:59: within preceding calendar day's dinner window (1:01 PM - 12:59 AM)
    const yesterday = new Date(baseDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    candidates.push({ dateStr: yStr, mealType: 'dinner', dateObj: yesterday });
    candidates.push({ dateStr: ist.dateStr, mealType: 'breakfast_lunch', dateObj: baseDate });
    candidates.push({ dateStr: ist.dateStr, mealType: 'dinner', dateObj: baseDate });
  } else if (ist.timeMinutes <= 780) {
    // 1:00 AM through 1:00 PM: Breakfast/Lunch period active
    candidates.push({ dateStr: ist.dateStr, mealType: 'breakfast_lunch', dateObj: baseDate });
    candidates.push({ dateStr: ist.dateStr, mealType: 'dinner', dateObj: baseDate });
  } else {
    // 1:01 PM through 11:59 PM: Dinner period active (breakfast_lunch has passed)
    candidates.push({ dateStr: ist.dateStr, mealType: 'dinner', dateObj: baseDate });
  }

  // Look ahead up to 28 days for the next confirmed meal
  for (let i = 1; i <= 28; i++) {
    const futureDate = new Date(baseDate);
    futureDate.setDate(futureDate.getDate() + i);
    const fStr = futureDate.toISOString().split('T')[0];
    candidates.push({ dateStr: fStr, mealType: 'breakfast_lunch', dateObj: futureDate });
    candidates.push({ dateStr: fStr, mealType: 'dinner', dateObj: futureDate });
  }

  // Check each candidate slot in chronological order
  for (const slot of candidates) {
    const dayOfWeekIndex = (slot.dateObj.getDay() + 6) % 7;
    const dayKey = DAYS_MAP[dayOfWeekIndex].key;
    const weekId = getWeekId(getMondayOfWeek(0, slot.dateObj));

    const matched = meals.find((m) => {
      const isConfirmed = m.isLocked || m.status === 'confirmed';
      if (!isConfirmed || !m.title || m.title.trim().length === 0) {
        return false;
      }
      if (m.mealType !== slot.mealType) {
        return false;
      }
      if (m.dateStr) {
        return m.dateStr === slot.dateStr;
      }
      if (m.day === dayKey) {
        return !m.weekId || m.weekId === weekId;
      }
      return false;
    });

    if (matched) {
      const weekday = slot.dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: 'Asia/Kolkata',
      });
      const month = slot.dateObj.toLocaleDateString('en-US', {
        month: 'short',
        timeZone: 'Asia/Kolkata',
      });
      const dayNum = slot.dateObj.toLocaleDateString('en-US', {
        day: 'numeric',
        timeZone: 'Asia/Kolkata',
      });

      return {
        title: matched.title,
        mealTypeLabel: slot.mealType === 'dinner' ? 'Dinner' : 'Breakfast/Lunch',
        dateDisplay: `${weekday}, ${month} ${dayNum}`,
        meal: matched,
      };
    }
  }

  return null;
}
