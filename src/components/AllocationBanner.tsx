import React from 'react';
import { Person } from '../types';
import { Sparkles, Lock, Info, CheckCircle2 } from 'lucide-react';

interface AllocationBannerProps {
  currentUser: Person;
  remainingDecisions: number;
  maxDecisions: number;
  weekRangeText: string;
  isBonusWeek?: boolean;
}

export const AllocationBanner: React.FC<AllocationBannerProps> = ({
  currentUser,
  remainingDecisions,
  maxDecisions,
  weekRangeText,
  isBonusWeek = false,
}) => {
  const isLimitReached = remainingDecisions === 0;

  if (isLimitReached) {
    return (
      <div
        id="allocation-limit-reached-banner"
        className="w-full rounded-xl p-4 bg-zinc-900/90 border border-amber-500/30 text-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-black/20 mb-6"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-amber-200">
                Weekly Allocation Complete for {currentUser.name}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                {maxDecisions}/{maxDecisions} Claimed
              </span>
              {isBonusWeek && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  Bonus Week
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              You have used all your allocated meal {maxDecisions === 1 ? 'decision' : 'decisions'} for this week ({weekRangeText}). The remaining open slots are available for other group members to choose!
            </p>
          </div>
        </div>

        <div className="text-xs text-zinc-400 bg-zinc-950/60 px-3 py-1.5 rounded-lg border border-zinc-800 self-stretch sm:self-auto text-center flex-shrink-0">
          Locked for group consensus
        </div>
      </div>
    );
  }

  return (
    <div
      id="allocation-active-banner"
      className="w-full rounded-xl p-3.5 sm:p-4 bg-gradient-to-r from-[#0000FD]/10 via-zinc-900/80 to-zinc-900/80 border border-[#0000FD]/25 text-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-black/20 mb-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0000FD]/20 border border-[#0000FD]/40 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-semibold text-white">
              {currentUser.name} has <span className="text-blue-400 font-bold">{remainingDecisions} of {maxDecisions}</span> {maxDecisions === 1 ? 'decision' : 'decisions'} remaining
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0000FD]/20 text-blue-300 border border-[#0000FD]/30">
              {maxDecisions - remainingDecisions}/{maxDecisions} Used
            </span>
            {isBonusWeek ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50">
                2 Decisions (Bonus Turn)
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                1 Guaranteed Decision
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {isBonusWeek
              ? 'You received 2 meal decisions this week through the fair rotation. Click any empty slot to lock a meal.'
              : 'You have 1 guaranteed meal decision this week (with priority for additional bonus decisions next week!). Click an empty slot to plan.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-blue-400/90 font-medium flex-shrink-0">
        <Info className="w-3.5 h-3.5" />
        <span>Click an empty slot to plan</span>
      </div>
    </div>
  );
};
