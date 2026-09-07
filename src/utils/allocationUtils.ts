import { PREDEFINED_PEOPLE } from '../data/mockData';
import { MealEntry } from '../types';
import { getMondayFromWeekId } from './dateUtils';

// Epoch Monday: September 7, 2026 (Day 0 of rotation)
// At epoch week (0), Shreyansh, Shreshth, Yashmeet, Aadi, Mudit have 2 decisions, Vihaan, Pravar, Atiksh, Arin have 1 decision.
const ANCHOR_MONDAY_EPOCH = new Date(2026, 8, 7, 0, 0, 0, 0); // 2026-09-07

export const TOTAL_WEEKLY_MEAL_SLOTS = 14; // 7 days * 2 meals
export const TOTAL_MEMBERS = 9;
export const GUARANTEED_DECISIONS = 1;
export const ADDITIONAL_BONUS_DECISIONS = 5; // 5 people get 2, 4 people get 1

/**
 * Returns integer week index relative to anchor Monday (Sep 7, 2026)
 */
export function getRotationWeekIndex(mondayDate: Date): number {
  const target = new Date(mondayDate);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - ANCHOR_MONDAY_EPOCH.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

export interface WeekAllocationInfo {
  personId: string;
  personName: string;
  maxDecisions: number; // 1 or 2
  isBonus: boolean; // true if part of the 5 additional decisions in rotation
  bonusPriorityReason: string;
}

/**
 * Calculates fair rotation allocations for all 9 members for a given Monday date.
 * Rules:
 * 1. 14 meal slots per week (7 days x 2 meal times).
 * 2. Every member gets at least 1 decision.
 * 3. Exactly 5 additional decisions each week (5 get 2 decisions, 4 get 1 decision).
 * 4. Deterministic rotation: The 4 people who received only 1 decision in week W-1
 *    get first priority for the 5 additional decisions in week W, plus 1 more in circular rotation.
 */
export function getAllocationsForWeek(mondayDate: Date): Record<string, WeekAllocationInfo> {
  const weekIdx = getRotationWeekIndex(mondayDate);

  // Circular rotation start offset: each week advances by 5 slots mod 9
  // Because in the previous week, the 4 people who got 1 decision were at offsets 5, 6, 7, 8.
  // When next week starts at (prevStart + 5) % 9, those 4 people are at offsets 0, 1, 2, 3 (first priority)!
  const startIdx = ((weekIdx * ADDITIONAL_BONUS_DECISIONS) % TOTAL_MEMBERS + TOTAL_MEMBERS) % TOTAL_MEMBERS;

  // The 5 members who get 2 decisions (1 guaranteed + 1 additional)
  const bonusIndices = new Set<number>();
  for (let i = 0; i < ADDITIONAL_BONUS_DECISIONS; i++) {
    bonusIndices.add((startIdx + i) % TOTAL_MEMBERS);
  }

  const result: Record<string, WeekAllocationInfo> = {};

  PREDEFINED_PEOPLE.forEach((person, index) => {
    const isBonus = bonusIndices.has(index);
    const maxDecisions = isBonus ? 2 : 1;
    const bonusPriorityReason = isBonus
      ? 'Received 1 of 5 additional weekly decisions (rotation)'
      : 'Guaranteed 1 weekly decision (priority next week)';

    result[person.id] = {
      personId: person.id,
      personName: person.name,
      maxDecisions,
      isBonus,
      bonusPriorityReason,
    };
  });

  return result;
}

/**
 * Returns stats for a specific user in a specific week
 */
export function getUserWeekStats(
  personId: string,
  mondayDate: Date,
  weekId: string,
  meals: MealEntry[]
): {
  maxDecisions: number;
  usedDecisions: number;
  remainingDecisions: number;
  isBonus: boolean;
} {
  const allocations = getAllocationsForWeek(mondayDate);
  const personAlloc = allocations[personId] || { maxDecisions: 1, isBonus: false };

  const userMealsThisWeek = meals.filter(
    (m) => m.weekId === weekId && m.decidedByPersonId === personId && m.isLocked
  );

  const usedDecisions = userMealsThisWeek.length;
  const remainingDecisions = Math.max(0, personAlloc.maxDecisions - usedDecisions);

  return {
    maxDecisions: personAlloc.maxDecisions,
    usedDecisions,
    remainingDecisions,
    isBonus: personAlloc.isBonus,
  };
}

/**
 * Deterministically computes the maximum allowed meal decisions (1 or 2)
 * for a person in a given ISO week ID.
 */
export function getMaxDecisionsForPersonAndWeek(weekId: string, personId: string): number {
  const monday = getMondayFromWeekId(weekId);
  const allocations = getAllocationsForWeek(monday);
  return allocations[personId]?.maxDecisions || 1;
}
