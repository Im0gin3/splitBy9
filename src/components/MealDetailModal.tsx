import React, { useState, useEffect } from 'react';
import { MealEntry, Person } from '../types';
import { CheckCircle, X, Tag, User, Calendar, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MealDetailModalProps {
  isOpen: boolean;
  meal: MealEntry | null;
  currentUser: Person;
  onClose: () => void;
  onRemoveMeal?: (meal: MealEntry) => Promise<void>;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  isOpen,
  meal,
  currentUser,
  onClose,
  onRemoveMeal,
}) => {
  const [isConfirmingRemove, setIsConfirmingRemove] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Reset confirmation state when modal opens/closes or meal changes
  useEffect(() => {
    if (!isOpen) {
      setIsConfirmingRemove(false);
      setIsRemoving(false);
      setRemoveError(null);
    }
  }, [isOpen, meal?.id]);

  if (!isOpen || !meal) return null;

  const isOwner = meal.decidedByPersonId === currentUser.id;
  const isAtiksh = currentUser.id === 'person-8';
  const mealTypeLabel = meal.mealType === 'breakfast_lunch' ? 'Breakfast / Lunch' : 'Dinner';

  const handleExecuteRemove = async () => {
    if (!onRemoveMeal || !meal) return;
    try {
      setIsRemoving(true);
      setRemoveError(null);
      await onRemoveMeal(meal);
      setIsConfirmingRemove(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove meal.';
      setRemoveError(msg);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="fixed inset-0" onClick={isRemoving ? undefined : onClose} />

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
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isConfirmingRemove
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                    : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                }`}
              >
                {isConfirmingRemove ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </div>
              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isConfirmingRemove ? 'text-red-400' : 'text-blue-400'
                  }`}
                >
                  {isConfirmingRemove ? 'Privileged Action' : 'Confirmed Meal'}
                </span>
                <h3 className="text-base font-bold text-white">
                  {isConfirmingRemove ? 'Remove Meal' : `${mealTypeLabel} Details`}
                </h3>
              </div>
            </div>

            <button
              onClick={isRemoving ? undefined : onClose}
              disabled={isRemoving}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conditional Content: Confirmation Step vs Normal Details */}
          {isConfirmingRemove ? (
            <div>
              <div className="p-5 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-white">Remove this meal?</h4>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    This will make the slot available again and return the decision to{' '}
                    <span className="text-white font-semibold">
                      {meal.decidedByPersonName || 'the original decision-maker'}
                    </span>.
                  </p>
                </div>

                {/* Target Meal Preview */}
                <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Target Meal
                  </div>
                  <div className="text-sm font-semibold text-white truncate">{meal.title}</div>
                  <div className="text-xs text-zinc-400 capitalize">
                    {meal.day} • {mealTypeLabel}
                  </div>
                </div>

                {removeError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{removeError}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300/90 leading-relaxed">
                  The slot will immediately become empty and available for anyone in the group to claim. {meal.decidedByPersonName} will regain 1 decision for this week without exceeding their allocated maximum.
                </div>
              </div>

              {/* Confirmation Actions */}
              <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-2 bg-zinc-950">
                <button
                  id="cancel-remove-meal-btn"
                  type="button"
                  disabled={isRemoving}
                  onClick={() => {
                    setIsConfirmingRemove(false);
                    setRemoveError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  id="confirm-remove-meal-btn"
                  type="button"
                  disabled={isRemoving}
                  onClick={handleExecuteRemove}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-red-950/50 cursor-pointer"
                >
                  {isRemoving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Removing...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Meal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Normal Body */}
              <div className="p-5 space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-white mb-1.5">{meal.title}</h4>
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
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>This meal is confirmed and saved for the group.</span>
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-4 border-t border-zinc-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400 truncate mr-2">
                  {isOwner
                    ? 'Your confirmed decision'
                    : `Chosen by ${meal.decidedByPersonName}`}
                </span>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAtiksh && onRemoveMeal && (
                    <button
                      id="remove-meal-trigger-btn"
                      type="button"
                      onClick={() => {
                        setRemoveError(null);
                        setIsConfirmingRemove(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-xs font-semibold text-red-400 border border-red-800/40 hover:border-red-700/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Meal</span>
                    </button>
                  )}

                  <button
                    id="close-detail-modal-btn"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-white border border-zinc-700 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
