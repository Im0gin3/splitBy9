import React from 'react';
import { Person } from '../types';
import { ChevronLeft, ChevronRight, Users, Utensils, Lock, LogOut } from 'lucide-react';

interface HeaderProps {
  currentUser: Person;
  weekOffset: number;
  weekRangeText: string;
  remainingDecisions: number;
  maxDecisions: number;
  isBonusWeek?: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onResetToCurrentWeek: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  weekOffset,
  weekRangeText,
  remainingDecisions,
  maxDecisions,
  isBonusWeek,
  onPrevWeek,
  onNextWeek,
  onResetToCurrentWeek,
  onLogout,
}) => {
  const isLimitReached = remainingDecisions === 0;

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Brand logo & Active user */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0000FD] flex items-center justify-center text-white shadow-lg shadow-[#0000FD]/25">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                  Meal Planner
                </span>
                <span className="hidden sm:inline-flex text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                  Group of 9
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Weekly group dinner & lunch schedule
              </p>
            </div>
          </div>

          {/* Mobile Profile & Logout quick button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              id="mobile-logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
              title="Log out"
            >
              <div
                className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.shortName}
              </div>
              <span>Log out</span>
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Center: Week Navigator with Left/Right Arrows */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <button
            id="prev-week-btn"
            onClick={onPrevWeek}
            aria-label="Previous Week"
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
            <span className="text-xs sm:text-sm font-semibold text-zinc-100 whitespace-nowrap">
              {weekRangeText}
            </span>
            {weekOffset === 0 ? (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#0000FD]/20 text-blue-400 border border-[#0000FD]/30">
                Current
              </span>
            ) : (
              <button
                id="reset-current-week-btn"
                onClick={onResetToCurrentWeek}
                className="text-[10px] font-semibold text-zinc-400 hover:text-blue-400 hover:underline cursor-pointer"
              >
                Go to This Week
              </button>
            )}
          </div>

          <button
            id="next-week-btn"
            onClick={onNextWeek}
            aria-label="Next Week"
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Decision status pill & Profile & Logout (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {/* Remaining decisions pill */}
          <div
            id="user-decisions-status-badge"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isLimitReached
                ? 'bg-amber-950/30 text-amber-300 border-amber-800/50'
                : 'bg-[#0000FD]/10 text-blue-300 border-[#0000FD]/40'
            }`}
          >
            {isLimitReached ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>0 of {maxDecisions} {maxDecisions === 1 ? 'decision' : 'decisions'} left</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#0000FD] animate-pulse" />
                <span>
                  {remainingDecisions} of {maxDecisions} {maxDecisions === 1 ? 'decision' : 'decisions'} remaining
                </span>
                {isBonusWeek && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#0000FD]/30 text-blue-200">
                    Bonus
                  </span>
                )}
              </>
            )}
          </div>

          {/* Active user badge & Log out */}
          <div className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200">
            <div
              className="w-5 h-5 rounded-md text-[10px] flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: currentUser.avatarColor }}
            >
              {currentUser.shortName}
            </div>
            <span className="font-medium mr-1">{currentUser.name}</span>
            <button
              id="desktop-logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-400 text-[11px] font-medium transition-colors cursor-pointer"
              title="Log out of account"
            >
              <span>Log out</span>
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

