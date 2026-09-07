import React from 'react';
import { Person } from '../types';
import { Lock, X, Users, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LimitReachedModalProps {
  isOpen: boolean;
  currentUser: Person;
  maxDecisions: number;
  onClose: () => void;
  onSwitchUser: () => void;
}

export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({
  isOpen,
  currentUser,
  maxDecisions,
  onClose,
  onSwitchUser,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-md bg-zinc-950 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden z-10 p-6"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Allocated Decisions Used
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Weekly Quota Reached
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              <strong className="text-zinc-200">{currentUser.name}</strong> has already locked{' '}
              <strong className="text-amber-300">{maxDecisions} of {maxDecisions}</strong> allocated meal {maxDecisions === 1 ? 'decision' : 'decisions'} for this week.
            </p>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              To keep meals balanced across the 9 group members, the remaining open slots should be decided by other members.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-850 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
            >
              Got it
            </button>
            <button
              onClick={() => {
                onClose();
                onSwitchUser();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0000FD] hover:bg-blue-600 text-xs font-bold text-white transition-all shadow-md shadow-[#0000FD]/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Switch to Another Person</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
