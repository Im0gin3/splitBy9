import React, { useState, useEffect } from 'react';
import { Person, MealEntry, ClaimedProfile } from '../types';
import { PREDEFINED_PEOPLE } from '../data/mockData';
import { getAllocationsForWeek } from '../utils/allocationUtils';
import { subscribeToWeekMeals } from '../services/mealPlannerService';
import { AuthModal } from './AuthModal';
import { Users, ArrowRight, CheckCircle2, Calendar, Sparkles, Lock, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface UserSelectionProps {
  currentWeekId: string;
  weekRangeText: string;
  mondayDate: Date;
  meals: MealEntry[];
  claimedProfiles: Record<string, ClaimedProfile>;
  onAuthenticate: (person: Person, password: string, isNewAccount: boolean) => Promise<void>;
}

export const UserSelection: React.FC<UserSelectionProps> = ({
  currentWeekId,
  weekRangeText,
  mondayDate,
  meals,
  claimedProfiles,
  onAuthenticate,
}) => {
  const [selectedPersonForAuth, setSelectedPersonForAuth] = useState<Person | null>(null);
  const [liveMeals, setLiveMeals] = useState<MealEntry[]>(meals || []);

  // Sync if parent updates meals
  useEffect(() => {
    if (meals && meals.length > 0) {
      setLiveMeals(meals);
    }
  }, [meals]);

  // Real-time listener for current week's meal slots to ensure accurate decision counts
  useEffect(() => {
    const unsubscribe = subscribeToWeekMeals(
      currentWeekId,
      (loadedMeals) => {
        setLiveMeals(loadedMeals);
      },
      (err) => {
        console.warn('Could not subscribe to meals in UserSelection:', err);
      }
    );
    return () => unsubscribe();
  }, [currentWeekId]);

  // Get rotation allocations for the currently viewed week
  const allocations = getAllocationsForWeek(mondayDate);

  // Calculate each person's stats according to rotation allocation and confirmed meals
  const getPersonStats = (personId: string) => {
    const alloc = allocations[personId] || { maxDecisions: 1, isBonus: false };
    const userMealsThisWeek = liveMeals.filter(
      (m) =>
        m.weekId === currentWeekId &&
        m.decidedByPersonId === personId &&
        (m.isLocked || m.status === 'confirmed')
    );
    const count = userMealsThisWeek.length;
    const remaining = Math.max(0, alloc.maxDecisions - count);
    return { count, maxDecisions: alloc.maxDecisions, remaining, isBonus: alloc.isBonus };
  };

  const handleCardClick = (person: Person) => {
    setSelectedPersonForAuth(person);
  };

  const handleAuthSubmit = async (password: string, isNewAccount: boolean) => {
    if (!selectedPersonForAuth) return;
    await onAuthenticate(selectedPersonForAuth, password, isNewAccount);
    setSelectedPersonForAuth(null);
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col justify-between px-4 py-8 md:py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#0000FD]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#0000FD]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header section */}
      <header className="max-w-4xl mx-auto w-full text-center relative z-10 pt-4 pb-8">

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          the crib
        </h1>

        {/* Info pills describing the actual 14 slots and rotating allocations */}
        <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 border border-zinc-800/60 px-4 py-2 rounded-xl">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Current Week: <strong className="text-white">{weekRangeText}</strong></span>
          </div>
        </div>
      </header>

      {/* Predefined 9 People Grid */}
      <main className="max-w-4xl mx-auto w-full relative z-10 my-auto">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4 px-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#0000FD]" />
            Choose Your Profile
          </span>
          <span className="text-zinc-400">9 Profiles Available</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PREDEFINED_PEOPLE.map((person) => {
            const stats = getPersonStats(person.id);
            const isCompleted = stats.remaining === 0;
            const profileStatus = claimedProfiles[person.id];
            const isClaimed = !!profileStatus?.claimed;

            return (
              <motion.button
                key={person.id}
                id={`select-user-${person.id}`}
                onClick={() => handleCardClick(person)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/80 hover:border-[#0000FD] transition-all text-left shadow-lg shadow-black/40 hover:shadow-[#0000FD]/10 cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  {/* Avatar with monogram */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-inner relative border border-white/10"
                    style={{ backgroundColor: person.avatarColor }}
                  >
                    {person.shortName}
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#07070a] flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 text-black" />
                      </div>
                    )}
                  </div>

                  {/* Name and status */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-100 group-hover:text-white transition-colors text-base">
                        {person.name}
                      </span>
                      {isClaimed ? (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5 text-zinc-400" />
                          Claimed
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#0000FD]/20 text-blue-300 border border-[#0000FD]/30">
                          Available
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      {isCompleted ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          All decisions used ({stats.count}/{stats.maxDecisions})
                        </span>
                      ) : (
                        <span className="text-zinc-400">
                          <strong className="text-blue-400 font-semibold">{stats.remaining} of {stats.maxDecisions}</strong> {stats.remaining === 1 ? 'decision' : 'decisions'} left this week
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action arrow */}
                <div className="w-8 h-8 rounded-lg bg-zinc-800/60 group-hover:bg-[#0000FD] flex items-center justify-center text-zinc-400 group-hover:text-white transition-all ml-2 flex-shrink-0">
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>

      {/* Footer info */}
      <footer className="max-w-4xl mx-auto w-full text-center relative z-10 pt-8 pb-2 text-xs text-zinc-400">
        <p>
          bhai breakfast pack kar liyo
        </p>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={!!selectedPersonForAuth}
        person={selectedPersonForAuth}
        profileStatus={selectedPersonForAuth ? claimedProfiles[selectedPersonForAuth.id] || null : null}
        onClose={() => setSelectedPersonForAuth(null)}
        onSubmit={handleAuthSubmit}
      />
    </div>
  );
};
