import React, { useState } from 'react';
import { DayInfo, MealEntry, MealType, Person } from '../types';
import { Lock, Plus, Calendar, Clock, Sparkles, Coffee, UtensilsCrossed, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface WeeklyGridProps {
  days: DayInfo[];
  meals: MealEntry[];
  currentUser: Person;
  remainingDecisions: number;
  onSelectEmptySlot: (day: DayInfo, mealType: MealType) => void;
  onSelectLockedMeal: (meal: MealEntry) => void;
}

interface MealTypeConfig {
  type: MealType;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const MEAL_TYPES: MealTypeConfig[] = [
  {
    type: 'breakfast_lunch',
    label: 'Breakfast / Lunch',
    sublabel: 'Morning & Midday fuel',
    icon: <Coffee className="w-4 h-4 text-amber-400" />,
  },
  {
    type: 'dinner',
    label: 'Dinner',
    sublabel: 'Evening shared meal',
    icon: <UtensilsCrossed className="w-4 h-4 text-blue-400" />,
  },
];

export const WeeklyGrid: React.FC<WeeklyGridProps> = ({
  days,
  meals,
  currentUser,
  remainingDecisions,
  onSelectEmptySlot,
  onSelectLockedMeal,
}) => {
  // Mobile active day tab selection (defaults to current day if in week, or Monday)
  const todayKey = days.find((d) => d.isToday)?.key || 'monday';
  const [activeMobileDay, setActiveMobileDay] = useState<string>(todayKey);
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');
  const [reservedAlert, setReservedAlert] = useState<string | null>(null);

  // Helper to find slot meal
  const getMealForSlot = (dayKey: string, mealType: MealType): MealEntry | undefined => {
    return meals.find((m) => m.day === dayKey && m.mealType === mealType);
  };

  const handleSlotClick = (day: DayInfo, mealType: MealType) => {
    const existing = getMealForSlot(day.key, mealType);
    if (existing?.status === 'reserved' && existing.tempLock && existing.tempLock.expiresAt > Date.now()) {
      if (existing.tempLock.lockedByPersonId !== currentUser.id) {
        setReservedAlert(
          `${existing.tempLock.lockedByName || 'Another member'} is currently reserving and planning this slot. Please choose another open slot or try again shortly.`
        );
        setTimeout(() => setReservedAlert(null), 4000);
        return;
      }
    }
    onSelectEmptySlot(day, mealType);
  };

  return (
    <div className="w-full space-y-4">
      {/* View Switcher Controls (Desktop & Mobile view toggles) */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>7 Days • 14 Meal Opportunities</span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'grid'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Board Grid
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'cards'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Day Cards
          </button>
        </div>
      </div>

      {/* Temporary lock alert toast if clicked an actively reserved slot */}
      {reservedAlert && (
        <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 flex items-center gap-2 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{reservedAlert}</span>
        </div>
      )}

      {/* Mobile Day Selector Bar */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveMobileDay('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeMobileDay === 'all'
              ? 'bg-[#0000FD] text-white shadow-md shadow-[#0000FD]/25'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          Full Week
        </button>
        {days.map((day) => (
          <button
            key={`mobile-tab-${day.key}`}
            onClick={() => setActiveMobileDay(day.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeMobileDay === day.key
                ? 'bg-[#0000FD] text-white shadow-md shadow-[#0000FD]/25'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>{day.shortName}</span>
            <span className="text-[10px] opacity-75">{day.displayDate.split(' ')[1]}</span>
            {day.isToday && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* DESKTOP / MAIN GRID VIEW */}
      <div
        className={`${
          viewMode === 'cards' ? 'hidden' : 'hidden lg:block'
        } w-full overflow-x-auto rounded-2xl border border-zinc-800/90 bg-zinc-950 shadow-xl`}
      >
        <div className="min-w-[1000px] divide-y divide-zinc-800/80">
          {/* Days Header Row (Columns) */}
          <div className="grid grid-cols-8 bg-zinc-900/60 text-xs">
            {/* Corner header */}
            <div className="p-3.5 border-r border-zinc-800/80 flex items-center text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              Meal Time
            </div>

            {/* 7 Days Columns */}
            {days.map((day) => (
              <div
                key={day.key}
                className={`p-3 text-center border-r border-zinc-800/80 last:border-r-0 transition-colors ${
                  day.isToday ? 'bg-[#0000FD]/10' : ''
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="font-bold text-sm text-zinc-100">{day.name}</span>
                  {day.isToday && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#0000FD] text-white">
                      Today
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
                  {day.displayDate}
                </div>
              </div>
            ))}
          </div>

          {/* Meal Types Rows (Breakfast/Lunch and Dinner) */}
          {MEAL_TYPES.map((mealTypeObj) => (
            <div
              key={mealTypeObj.type}
              className="grid grid-cols-8 divide-x divide-zinc-800/80 min-h-[140px]"
            >
              {/* Row Header Label */}
              <div className="p-4 bg-zinc-900/30 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-zinc-850 border border-zinc-800">
                    {mealTypeObj.icon}
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-zinc-100">
                    {mealTypeObj.label}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 hidden xl:block">
                  {mealTypeObj.sublabel}
                </p>
              </div>

              {/* 7 Day Slot Cells for this meal type */}
              {days.map((day) => {
                const meal = getMealForSlot(day.key, mealTypeObj.type);
                const isLocked = !!meal?.isLocked;
                const isDecidedByCurrent = meal?.decidedByPersonId === currentUser.id;
                const isReserved = meal?.status === 'reserved' && meal?.tempLock && meal.tempLock.expiresAt > Date.now();
                const isReservedByOther = isReserved && meal?.tempLock?.lockedByPersonId !== currentUser.id;
                const isReservedByMe = isReserved && meal?.tempLock?.lockedByPersonId === currentUser.id;

                return (
                  <div
                    key={`${day.key}-${mealTypeObj.type}`}
                    className={`p-2 transition-colors relative flex flex-col justify-stretch ${
                      day.isToday ? 'bg-[#0000FD]/5' : ''
                    }`}
                  >
                    {isLocked && meal ? (
                      /* LOCKED / CONFIRMED MEAL CELL */
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        id={`meal-cell-${meal.id}`}
                        onClick={() => onSelectLockedMeal(meal)}
                        className={`h-full w-full p-3 rounded-xl flex flex-col justify-between cursor-pointer transition-all border shadow-md relative overflow-hidden group ${
                          isDecidedByCurrent
                            ? 'bg-blue-950/25 border-[#0000FD]/50 hover:border-[#0000FD] shadow-[#0000FD]/10'
                            : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 shadow-black/40'
                        }`}
                      >
                        {/* Lock indicator badge */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isDecidedByCurrent
                                ? 'bg-[#0000FD]/25 text-blue-300 border-[#0000FD]/40'
                                : 'bg-zinc-800/90 text-zinc-300 border-zinc-700/60'
                            }`}
                          >
                            <Lock className="w-2.5 h-2.5 text-blue-400" />
                            <span>Locked</span>
                          </span>

                          {/* Avatar tag of who locked it */}
                          <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[80px]">
                            {isDecidedByCurrent ? 'You' : meal.decidedByPersonName}
                          </span>
                        </div>

                        {/* Meal Title */}
                        <div className="my-auto">
                          <h4 className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-white line-clamp-2 leading-snug">
                            {meal.title}
                          </h4>
                          {meal.notes && (
                            <p className="text-[11px] text-zinc-400 line-clamp-1 mt-1">
                              {meal.notes}
                            </p>
                          )}
                        </div>

                        {/* Footer: Tags & Decided by pill */}
                        <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                          {meal.tags && meal.tags.length > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800/70 text-zinc-400 truncate max-w-[85px]">
                              {meal.tags[0]}
                            </span>
                          ) : (
                            <span className="text-zinc-400">Confirmed</span>
                          )}

                          <span className="text-blue-400/80 group-hover:text-blue-300 group-hover:underline">
                            View
                          </span>
                        </div>
                      </motion.div>
                    ) : isReservedByOther ? (
                      /* TEMPORARILY RESERVED BY ANOTHER USER */
                      <div
                        id={`reserved-slot-${day.key}-${mealTypeObj.type}`}
                        onClick={() => handleSlotClick(day, mealTypeObj.type)}
                        className="h-full w-full rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 flex flex-col justify-between text-left cursor-pointer transition-all shadow-sm"
                        title="Click for reservation info"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            <Clock className="w-2.5 h-2.5 animate-spin" />
                            <span>Reserved</span>
                          </span>
                          <span className="text-[10px] text-amber-400/80">Planning</span>
                        </div>
                        <div className="my-auto">
                          <div className="text-xs font-semibold text-amber-100">
                            {meal?.tempLock?.lockedByName || 'Another member'}
                          </div>
                          <div className="text-[10px] text-amber-300/70 mt-0.5">
                            is entering a meal...
                          </div>
                        </div>
                        <div className="text-[10px] text-zinc-400">Temporary lock</div>
                      </div>
                    ) : (
                      /* OPEN / EMPTY CELL (OR RESERVED BY ME) */
                      <button
                        id={`empty-slot-${day.key}-${mealTypeObj.type}`}
                        onClick={() => handleSlotClick(day, mealTypeObj.type)}
                        className={`h-full w-full rounded-xl border border-dashed p-3 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                          isReservedByMe
                            ? 'border-blue-400 bg-blue-950/30'
                            : remainingDecisions > 0
                            ? 'border-zinc-800/90 bg-zinc-900/20 hover:bg-[#0000FD]/5 hover:border-[#0000FD]/60'
                            : 'border-zinc-800/40 bg-zinc-900/10 hover:border-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all mb-1.5 ${
                            isReservedByMe
                              ? 'bg-[#0000FD] text-white'
                              : remainingDecisions > 0
                              ? 'bg-zinc-900 group-hover:bg-[#0000FD] text-zinc-400 group-hover:text-white border border-zinc-800'
                              : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800/50'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </div>

                        <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                          {isReservedByMe
                            ? 'Your Draft'
                            : remainingDecisions > 0
                            ? 'Claim Meal'
                            : 'Open Slot'}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">
                          {isReservedByMe
                            ? 'Click to complete'
                            : remainingDecisions > 0
                            ? 'Click to decide'
                            : 'Limit reached'}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card / Stacked View (For small devices or when user toggles cards) */}
      <div
        className={`${
          viewMode === 'cards' ? 'block' : 'block lg:hidden'
        } space-y-4`}
      >
        {days
          .filter((day) => activeMobileDay === 'all' || activeMobileDay === day.key)
          .map((day) => (
            <div
              key={`mobile-card-${day.key}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-lg backdrop-blur-sm"
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-base text-white">
                    {day.name}
                  </div>
                  <span className="text-xs text-zinc-400 font-medium">
                    {day.displayDate}
                  </span>
                </div>
                {day.isToday && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0000FD] text-white">
                    Today
                  </span>
                )}
              </div>

              {/* Day's Meals */}
              <div className="space-y-3">
                {MEAL_TYPES.map((mealTypeObj) => {
                  const meal = getMealForSlot(day.key, mealTypeObj.type);
                  const isLocked = !!meal?.isLocked;
                  const isReserved = meal?.status === 'reserved' && meal?.tempLock && meal.tempLock.expiresAt > Date.now();
                  const isReservedByOther = isReserved && meal?.tempLock?.lockedByPersonId !== currentUser.id;
                  const isReservedByMe = isReserved && meal?.tempLock?.lockedByPersonId === currentUser.id;

                  return (
                    <div
                      key={`mobile-${day.key}-${mealTypeObj.type}`}
                      className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                          <span>{mealTypeObj.icon}</span>
                          <span>{mealTypeObj.label}</span>
                        </div>

                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/40">
                            <Lock className="w-2.5 h-2.5 text-blue-400" />
                            Locked
                          </span>
                        ) : isReservedByOther ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40">
                            <Clock className="w-2.5 h-2.5 animate-spin" />
                            Reserved
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Open slot</span>
                        )}
                      </div>

                      {isLocked && meal ? (
                        <div
                          onClick={() => onSelectLockedMeal(meal)}
                          className="cursor-pointer"
                        >
                          <h4 className="font-bold text-sm text-white hover:text-blue-300 transition-colors">
                            {meal.title}
                          </h4>
                          {meal.notes && (
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {meal.notes}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 pt-2 border-t border-zinc-800/60">
                            <span>
                              Decided by: <strong className="text-zinc-300">{meal.decidedByPersonName}</strong>
                            </span>
                            <span className="text-blue-400 font-semibold">View details →</span>
                          </div>
                        </div>
                      ) : isReservedByOther ? (
                        <div
                          onClick={() => handleSlotClick(day, mealTypeObj.type)}
                          className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 cursor-pointer"
                        >
                          <strong>{meal?.tempLock?.lockedByName}</strong> is currently planning this meal.
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSlotClick(day, mealTypeObj.type)}
                          className={`w-full py-2.5 px-3 rounded-lg border border-dashed flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                            isReservedByMe
                              ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                              : remainingDecisions > 0
                              ? 'border-blue-500/40 bg-blue-500/5 text-blue-300 hover:bg-blue-500/15'
                              : 'border-zinc-800 text-zinc-400 hover:text-zinc-300'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            {isReservedByMe
                              ? 'Finish Your Draft'
                              : remainingDecisions > 0
                              ? `Claim ${mealTypeObj.label}`
                              : 'Open Slot (Limit Reached)'}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
