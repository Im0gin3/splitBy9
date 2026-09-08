/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Person, MealEntry, DayInfo, MealType, ClaimedProfile } from './types';
import { PREDEFINED_PEOPLE } from './data/mockData';
import { getMondayOfWeek, getWeekId, formatWeekRange, getDaysForWeek } from './utils/dateUtils';
import { getAllocationsForWeek } from './utils/allocationUtils';
import {
  subscribeToClaimedProfiles,
  subscribeToWeekMeals,
  registerAndClaimPerson,
  loginPerson,
  getPersonForUid,
  logout,
  getSlotDocId,
  acquireTempLock,
  releaseTempLock,
  confirmMealSlot,
  seedInitialWeekMealsIfEmpty,
  ensureUserWeeklyDecision,
} from './services/mealPlannerService';
import { UserSelection } from './components/UserSelection';
import { Header } from './components/Header';
import { WeeklyGrid } from './components/WeeklyGrid';
import { MealConfirmModal } from './components/MealConfirmModal';
import { MealDetailModal } from './components/MealDetailModal';
import { LimitReachedModal } from './components/LimitReachedModal';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Authentication states
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<Person | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Claimed profiles real-time status from Firestore
  const [claimedProfiles, setClaimedProfiles] = useState<Record<string, ClaimedProfile>>({});

  // Week offset state (0 = current week, -1 = previous week, 1 = next week)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Real-time Firestore meals for currently active week
  const [meals, setMeals] = useState<MealEntry[]>([]);

  // Modal interaction states
  const [confirmModalSlot, setConfirmModalSlot] = useState<{
    day: DayInfo;
    mealType: MealType;
    slotDocId: string;
  } | null>(null);
  const [detailModalMeal, setDetailModalMeal] = useState<MealEntry | null>(null);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState<boolean>(false);

  // Notification toast state
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Calculated date structures for the current weekOffset
  const mondayDate = useMemo(() => getMondayOfWeek(weekOffset), [weekOffset]);
  const currentWeekId = useMemo(() => getWeekId(mondayDate), [mondayDate]);
  const weekRangeText = useMemo(() => formatWeekRange(mondayDate), [mondayDate]);
  const days = useMemo(() => getDaysForWeek(mondayDate), [mondayDate]);

  // Fair rotation allocations for this specific week
  // 5 people receive 2 decisions, 4 people receive 1 decision. (Total = 14)
  const weekAllocations = useMemo(() => getAllocationsForWeek(mondayDate), [mondayDate]);

  // Current user decision calculations for this week based on fair rotation
  const currentUserStats = useMemo(() => {
    if (!currentUser) return { maxDecisions: 1, used: 0, remaining: 1, isBonus: false };

    const alloc = weekAllocations[currentUser.id] || { maxDecisions: 1, isBonus: false };
    const userWeekMeals = meals.filter(
      (m) => m.decidedByPersonId === currentUser.id && m.isLocked && m.weekId === currentWeekId
    );
    const used = userWeekMeals.length;
    const remaining = Math.max(0, alloc.maxDecisions - used);

    return {
      maxDecisions: alloc.maxDecisions,
      used,
      remaining,
      isBonus: alloc.isBonus,
    };
  }, [currentUser, meals, weekAllocations, currentWeekId]);

  // Toast notification helper
  const showToast = (
    title: string,
    description: string,
    type: 'success' | 'info' | 'error' = 'success'
  ) => {
    setToastMessage({ title, description, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // 1. Listen to Firebase Auth state on mount
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        const matchedPerson = await getPersonForUid(user.uid);
        setCurrentUser(matchedPerson);
      } else {
        setAuthUser(null);
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Subscribe to real-time claimed profiles status
  useEffect(() => {
    const unsubscribeProfiles = subscribeToClaimedProfiles((profilesMap) => {
      setClaimedProfiles(profilesMap);
    });

    return () => unsubscribeProfiles();
  }, []);

  // Set of week IDs to subscribe to: currentWeekId (for active desktop week navigation),
  // plus thisWeekId and nextWeekId (for mobile 14-day schedule)
  const activeWeekIds = useMemo(() => {
    const ids = new Set<string>();
    ids.add(currentWeekId);
    ids.add(getWeekId(getMondayOfWeek(0)));
    ids.add(getWeekId(getMondayOfWeek(1)));
    return Array.from(ids);
  }, [currentWeekId]);

  // 3. Subscribe to real-time meal slots for all active weeks & seed if empty (authenticated only)
  useEffect(() => {
    // Seed sample meals if this is the first time the week is accessed (only if authenticated)
    if (authUser) {
      activeWeekIds.forEach((wId) => {
        seedInitialWeekMealsIfEmpty(wId);

        // Guarantee the user's weekly decision document exists in Firestore
        if (currentUser) {
          ensureUserWeeklyDecision(wId, {
            uid: authUser.uid,
            personId: currentUser.id,
            name: currentUser.name,
          }).catch((err) => {
            console.warn(`Could not ensure weekly decision document for ${wId}:`, err);
          });
        }
      });
    }

    const unsubs: (() => void)[] = [];
    const mealsByWeek: Record<string, MealEntry[]> = {};

    const recomputeMeals = () => {
      const combined: MealEntry[] = [];
      const seen = new Set<string>();
      Object.values(mealsByWeek).forEach((weekMealList) => {
        weekMealList.forEach((m) => {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            combined.push(m);
          }
        });
      });
      setMeals(combined);
    };

    activeWeekIds.forEach((wId) => {
      const unsub = subscribeToWeekMeals(
        wId,
        (loadedMeals) => {
          mealsByWeek[wId] = loadedMeals;
          recomputeMeals();
        },
        (err) => {
          console.warn(`Could not sync meals for week ${wId}:`, err);
        }
      );
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [activeWeekIds.join(','), authUser, currentUser]);

  // Handler: Authenticate via Claim or Login
  const handleAuthenticate = async (
    person: Person,
    password: string,
    isNewAccount: boolean
  ) => {
    if (isNewAccount) {
      const { user } = await registerAndClaimPerson(person, password);
      setAuthUser(user);
      setCurrentUser(person);
      showToast(
        'Profile Claimed!',
        `Welcome ${person.name}. Your password has been set and your account is active.`
      );
    } else {
      const { user } = await loginPerson(person, password);
      setAuthUser(user);
      setCurrentUser(person);
      showToast('Welcome back!', `Logged in as ${person.name}.`);
    }
  };

  // Handler: Log out
  const handleLogout = async () => {
    try {
      await logout();
      setAuthUser(null);
      setCurrentUser(null);
      showToast('Signed Out', 'You have been logged out securely.', 'info');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Handler: Selecting an empty slot to plan a meal
  const handleSelectEmptySlot = async (day: DayInfo, mealType: MealType) => {
    if (!currentUser || !authUser) return;

    const targetWeekId = day.weekId || getWeekId(day.date);
    const targetMonday = getMondayOfWeek(0, day.date);
    const targetAlloc = getAllocationsForWeek(targetMonday)[currentUser.id] || { maxDecisions: 1, isBonus: false };
    const userWeekMeals = meals.filter(
      (m) => m.decidedByPersonId === currentUser.id && m.isLocked && m.weekId === targetWeekId
    );
    const used = userWeekMeals.length;
    const remaining = Math.max(0, targetAlloc.maxDecisions - used);

    if (remaining <= 0) {
      setIsLimitModalOpen(true);
      return;
    }

    const slotDocId = getSlotDocId(targetWeekId, day.key, mealType);

    try {
      // Concurrently acquire temporary lock in Firestore
      await acquireTempLock(
        slotDocId,
        targetWeekId,
        day.key,
        day.dateStr,
        mealType,
        {
          uid: authUser.uid,
          personId: currentUser.id,
          name: currentUser.name,
        }
      );

      setConfirmModalSlot({ day, mealType, slotDocId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not reserve slot.';
      showToast('Slot Unavailable', msg, 'error');
    }
  };

  // Handler: Closing the confirm modal without confirming (releases temporary lock)
  const handleCloseConfirmModal = async () => {
    if (confirmModalSlot && authUser) {
      await releaseTempLock(confirmModalSlot.slotDocId, authUser.uid);
    }
    setConfirmModalSlot(null);
  };

  // Handler: Confirming & permanently locking a meal in Firestore
  const handleConfirmMeal = async (newMealData: Omit<MealEntry, 'id' | 'lockedAt'>) => {
    if (!currentUser || !authUser || !confirmModalSlot) return;

    const targetWeekId = confirmModalSlot.day.weekId || getWeekId(confirmModalSlot.day.date);
    const targetMonday = getMondayOfWeek(0, confirmModalSlot.day.date);
    const targetAlloc = getAllocationsForWeek(targetMonday)[currentUser.id] || { maxDecisions: 1, isBonus: false };

    try {
      await confirmMealSlot({
        slotId: confirmModalSlot.slotDocId,
        weekId: targetWeekId,
        day: confirmModalSlot.day.key,
        dateStr: confirmModalSlot.day.dateStr,
        mealType: confirmModalSlot.mealType,
        title: newMealData.title,
        notes: newMealData.notes,
        tags: newMealData.tags,
        user: {
          uid: authUser.uid,
          personId: currentUser.id,
          name: currentUser.name,
        },
        maxDecisions: targetAlloc.maxDecisions,
      });

      setConfirmModalSlot(null);
      showToast(
        'Meal Confirmed & Locked!',
        `"${newMealData.title}" is now locked for the group on ${newMealData.day}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm meal.';
      showToast('Error', msg, 'error');
      throw err;
    }
  };

  // Loading auth state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#0000FD] animate-spin mb-3" />
        <p className="text-xs text-zinc-400 font-medium">Connecting to meal group...</p>
      </div>
    );
  }

  // If no authenticated user, show the welcome and profile claim/login screen
  if (!currentUser || !authUser) {
    return (
      <UserSelection
        currentWeekId={currentWeekId}
        weekRangeText={weekRangeText}
        mondayDate={mondayDate}
        meals={meals}
        claimedProfiles={claimedProfiles}
        onAuthenticate={handleAuthenticate}
      />
    );
  }

  // Main Weekly Meal-Planning Interface
  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col selection:bg-[#0000FD] selection:text-white">
      {/* Top Navigation Header */}
      <Header
        currentUser={currentUser}
        weekOffset={weekOffset}
        weekRangeText={weekRangeText}
        remainingDecisions={currentUserStats.remaining}
        maxDecisions={currentUserStats.maxDecisions}
        isBonusWeek={currentUserStats.isBonus}
        onPrevWeek={() => setWeekOffset((prev) => prev - 1)}
        onNextWeek={() => setWeekOffset((prev) => prev + 1)}
        onResetToCurrentWeek={() => setWeekOffset(0)}
        onLogout={handleLogout}
      />

      {/* Main Board Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-3 sm:py-5 space-y-3 sm:space-y-4">
        {/* The Weekly Grid Centerpiece */}
        <WeeklyGrid
          days={days}
          meals={meals}
          currentUser={currentUser}
          remainingDecisions={currentUserStats.remaining}
          onSelectEmptySlot={handleSelectEmptySlot}
          onSelectLockedMeal={(meal) => setDetailModalMeal(meal)}
        />

        {/* Group member decision progress overview below the table */}
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-1.5 sm:gap-2 px-0.5 sm:px-1 text-xs">
          <span className="text-[11px] font-medium text-zinc-400 mr-0.5">
            Members:
          </span>
          {PREDEFINED_PEOPLE.map((p) => {
            const isMe = p.id === currentUser.id;
            const pAlloc = weekAllocations[p.id] || { maxDecisions: 1, isBonus: false };
            const count = meals.filter((m) => m.decidedByPersonId === p.id && m.isLocked).length;

            return (
              <div
                key={p.id}
                title={`${p.name} (${count}/${pAlloc.maxDecisions} decisions used this week${
                  pAlloc.isBonus ? ' • 2 decisions rotation bonus' : ' • 1 guaranteed decision'
                })`}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  isMe
                    ? 'bg-[#0000FD]/20 text-white border border-[#0000FD]/60 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800/60'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.avatarColor }}
                />
                <span>{p.shortName}</span>
                <span
                  className={`text-[10px] font-mono ${
                    count >= pAlloc.maxDecisions ? 'text-emerald-400 font-semibold' : 'text-zinc-400'
                  }`}
                >
                  ({count}/{pAlloc.maxDecisions})
                </span>
              </div>
            );
          })}
        </div>
      </main>

      {/* Confirmation Modal before locking a meal */}
      <MealConfirmModal
        isOpen={!!confirmModalSlot}
        currentUser={currentUser}
        selectedDay={confirmModalSlot?.day || null}
        selectedMealType={confirmModalSlot?.mealType || null}
        weekId={currentWeekId}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmMeal}
      />

      {/* Detail Modal for locked meals */}
      <MealDetailModal
        isOpen={!!detailModalMeal}
        meal={detailModalMeal}
        currentUser={currentUser}
        onClose={() => setDetailModalMeal(null)}
      />

      {/* Allocation Limit Reached Modal */}
      <LimitReachedModal
        isOpen={isLimitModalOpen}
        currentUser={currentUser}
        maxDecisions={currentUserStats.maxDecisions}
        onClose={() => setIsLimitModalOpen(false)}
        onSwitchUser={handleLogout}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 p-4 rounded-xl border shadow-2xl text-white max-w-sm ${
              toastMessage.type === 'error'
                ? 'bg-red-950 border-red-800/80'
                : 'bg-zinc-900 border-zinc-700/80'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white ${
                toastMessage.type === 'error' ? 'bg-red-600' : 'bg-[#0000FD]'
              }`}
            >
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white">{toastMessage.title}</div>
              <div className="text-[11px] text-zinc-300 mt-0.5">{toastMessage.description}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
