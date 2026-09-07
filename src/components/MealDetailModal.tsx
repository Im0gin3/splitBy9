import React from 'react';
import { MealEntry, Person } from '../types';
import { Lock, X, Tag, User, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MealDetailModalProps {
  isOpen: boolean;
  meal: MealEntry | null;
  currentUser: Person;
  onClose: () => void;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  isOpen,
  meal,
  currentUser,
  onClose,
}) => {
  if (!isOpen || !meal) return null;

  const isOwner = meal.decidedByPersonId === currentUser.id;
  const mealTypeLabel = meal.mealType === 'breakfast_lunch' ? 'Breakfast / Lunch' : 'Dinner';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-5 border-b border-zinc-800 flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Locked Meal
                </span>
                <h3 className="text-base font-bold text-white">
                  {mealTypeLabel} Details
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div>
              <h4 className="text-xl font-bold text-white mb-1.5">
                {meal.title}
              </h4>
              {meal.notes && (
                <p className="text-xs text-zinc-300 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80 leading-relaxed">
                  {meal.notes}
                </p>
              )}
            </div>

            {/* Tags */}
            {meal.tags && meal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {meal.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1"
                  >
                    <Tag className="w-2.5 h-2.5 text-blue-400" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800/80">
              <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                <div className="text-zinc-400 flex items-center gap-1 mb-1">
                  <User className="w-3 h-3 text-blue-400" />
                  Decided By
                </div>
                <div className="font-semibold text-zinc-200">
                  {meal.decidedByPersonName}
                  {isOwner && (
                    <span className="ml-1 text-[10px] text-blue-400 font-bold">(You)</span>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                <div className="text-zinc-400 flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-blue-400" />
                  Schedule
                </div>
                <div className="font-semibold text-zinc-200 capitalize">
                  {meal.day} • {mealTypeLabel}
                </div>
              </div>
            </div>

            {/* Status explanation */}
            <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-800/30 text-xs text-blue-300 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>This meal is confirmed and locked for the group.</span>
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              {isOwner ? 'Your confirmed decision (Permanently locked for group)' : `Chosen by ${meal.decidedByPersonName}`}
            </span>

            <button
              id="close-detail-modal-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-white border border-zinc-700 transition-colors ml-auto cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
