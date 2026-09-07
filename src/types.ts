export interface Person {
  id: string;
  name: string;
  shortName: string;
  avatarColor: string;
  accentColor: string;
  role?: string;
}

export type MealType = 'breakfast_lunch' | 'dinner';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TempLockInfo {
  lockedByUid: string;
  lockedByPersonId: string;
  lockedByName: string;
  expiresAt: number; // unix timestamp in ms
}

export interface MealEntry {
  id: string;
  weekId: string; // e.g. "2026-W37"
  day: DayOfWeek;
  dateStr: string; // ISO date string "2026-09-07"
  mealType: MealType;
  title: string;
  notes?: string;
  tags?: string[];
  decidedByPersonId: string;
  decidedByPersonName: string;
  decidedByUid?: string;
  isLocked: boolean;
  lockedAt: string; // timestamp
  status?: 'open' | 'reserved' | 'confirmed';
  tempLock?: TempLockInfo | null;
}

export interface DayInfo {
  key: DayOfWeek;
  name: string;
  shortName: string;
  date: Date;
  dateStr: string; // e.g. "2026-09-07"
  displayDate: string; // e.g. "Sep 7"
  displayDayAndDate: string; // e.g. "Mon, Sep 7"
  isToday: boolean;
}

export interface UserAllocation {
  personId: string;
  weekId: string;
  maxDecisions: number; // 1 or 2 depending on rotation
  usedDecisions: number;
  remainingDecisions: number;
  isBonus: boolean;
}

export interface ClaimedProfile {
  predefinedId: string;
  displayName: string;
  claimed: boolean;
  claimedByUid?: string;
}

export interface AuthUserProfile {
  uid: string;
  person: Person;
  email: string;
}
