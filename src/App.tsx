/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Person, MealEntry, DayInfo, MealType, ClaimedProfile } from './types';
import { PREDEFINED_PEOPLE, TOTAL_MEAL_SLOTS_PER_WEEK } from './data/mockData';
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
import { AllocationBanner } from './components/AllocationBanner';
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
      (m) => m.decidedByPersonId === currentUser.id && m.isLocked
    );
    const used = userWeekMeals.length;
    const remaining = Math.max(0, alloc.maxDecisions - used);

    return {
      maxDecisions: alloc.maxDecisions,
      used,
      remaining,
      isBonus: alloc.isBonus,
    };
  }, [currentUser, meals, weekAllocations]);

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

  // 3. Subscribe to real-time meal slots for the active week & seed if empty (authenticated only)
  useEffect(() => {
    if (!authUser) {
      setMeals([]);
      return;
    }

    // Seed sample meals if this is the first time the week is accessed
    seedInitialWeekMealsIfEmpty(currentWeekId);

    // Guarantee the user's weekly decision document exists in Firestore
    if (currentUser) {
      ensureUserWeeklyDecision(currentWeekId, {
        uid: authUser.uid,
        personId: currentUser.id,
        name: currentUser.name,
      }).catch((err) => {
        console.warn('Could not ensure weekly decision document:', err);
      });
    }

    const unsubscribeMeals = subscribeToWeekMeals(
      currentWeekId,
      (loadedMeals) => {
        setMeals(loadedMeals);
      },
      (err) => {
        console.warn(`Could not sync meals for week ${currentWeekId}:`, err);
      }
    );

    return () => unsubscribeMeals();
  }, [currentWeekId, authUser, currentUser]);

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

    if (currentUserStats.remaining <= 0) {
      setIsLimitModalOpen(true);
      return;
    }

    const slotDocId = getSlotDocId(currentWeekId, day.key, mealType);

    try {
      // Concurrently acquire temporary lock in Firestore
      await acquireTempLock(
        slotDocId,
        currentWeekId,
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

    try {
      await confirmMealSlot({
        slotId: confirmModalSlot.slotDocId,
        weekId: currentWeekId,
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
        maxDecisions: currentUserStats.maxDecisions,
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 space-y-6">
        {/* Top allocation message banner */}
        <AllocationBanner
          currentUser={currentUser}
          remainingDecisions={currentUserStats.remaining}
          maxDecisions={currentUserStats.maxDecisions}
          isBonusWeek={currentUserStats.isBonus}
          weekRangeText={weekRangeText}
        />

        {/* Section title & group overview badge */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Weekly Schedule</span>
              {/* Exact weekly total: "X / 14 meals planned" */}
              <span className="text-xs font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
                <strong className="text-blue-400">
                  {meals.filter((m) => m.isLocked).length}
                </strong>{' '}
                / {TOTAL_MEAL_SLOTS_PER_WEEK} meals planned
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Click an open slot to enter a meal. Confirmed meals are locked for the group.
            </p>
          </div>

          {/* Group member decision progress overview */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-medium text-zinc-400 mr-1 hidden sm:inline">
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
                      ? 'bg-[#0000FD]/20 text-white border border-[#0000FD]/60'
                      : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800/60'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.avatarColor }}
                  />
                  <span>{p.shortName}</span>
                  <span
                    className={`text-[10px] ${
                      count >= pAlloc.maxDecisions ? 'text-emerald-400' : 'text-zinc-400'
                    }`}
                  >
                    ({count}/{pAlloc.maxDecisions})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* The Weekly Grid Centerpiece */}
        <WeeklyGrid
          days={days}
          meals={meals}
          currentUser={currentUser}
          remainingDecisions={currentUserStats.remaining}
          onSelectEmptySlot={handleSelectEmptySlot}
          onSelectLockedMeal={(meal) => setDetailModalMeal(meal)}
        />
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
