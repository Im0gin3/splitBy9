import React, { useState } from 'react';
import { Person, DayInfo, MealType, MealEntry } from '../types';
import { POPULAR_MEAL_SUGGESTIONS } from '../data/mockData';
import { Lock, X, Check, Utensils, Tag, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MealConfirmModalProps {
  isOpen: boolean;
  currentUser: Person;
  selectedDay: DayInfo | null;
  selectedMealType: MealType | null;
  weekId: string;
  onClose: () => void;
  onConfirm: (newMeal: Omit<MealEntry, 'id' | 'lockedAt'>) => Promise<void> | void;
}

const COMMON_TAGS = ['Homemade', 'Takeout', 'High Protein', 'Vegetarian', 'Quick & Easy', 'Gluten Free'];

export const MealConfirmModal: React.FC<MealConfirmModalProps> = ({
  isOpen,
  currentUser,
  selectedDay,
  selectedMealType,
  weekId,
  onClose,
  onConfirm,
}) => {
  const [mealTitle, setMealTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !selectedDay || !selectedMealType) return null;

  const mealTypeLabel = selectedMealType === 'breakfast_lunch' ? 'Breakfast / Lunch' : 'Dinner';

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealTitle.trim()) {
      setError('Please enter a meal name or choose a suggestion.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      // Await confirmation write in Firestore
      await onConfirm({
        weekId,
        day: selectedDay.key,
        dateStr: selectedDay.dateStr,
        mealType: selectedMealType,
        title: mealTitle.trim(),
        notes: notes.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        decidedByPersonId: currentUser.id,
        decidedByPersonName: currentUser.name,
        isLocked: true,
      });

      // Reset local fields; modal closure is handled cleanly by parent state
      setMealTitle('');
      setNotes('');
      setSelectedTags([]);
      setError('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm meal. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        {/* Backdrop click (disabled while saving) */}
        <div
          className="fixed inset-0"
          onClick={() => {
            if (!isSubmitting) onClose();
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-[#0000FD]" />

          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-zinc-800/80 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0000FD]/15 border border-[#0000FD]/30 flex items-center justify-center text-[#0000FD] flex-shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-0.5">
                  Confirm Meal Decision
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Plan {mealTypeLabel}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedDay.name} ({selectedDay.displayDate}) • Deciding as{' '}
                  <strong className="text-zinc-200">{currentUser.name}</strong>
                </p>
              </div>
            </div>

            <button
              id="close-meal-modal-btn"
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleConfirm} className="p-5 sm:p-6 space-y-4">
            {/* Meal Title Input */}
            <div>
              <label htmlFor="meal-title-input" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                What do you want to eat? <span className="text-red-400">*</span>
              </label>
              <input
                id="meal-title-input"
                type="text"
                disabled={isSubmitting}
                value={mealTitle}
                onChange={(e) => {
                  setMealTitle(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g., Thai Green Curry with Coconut Rice"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#0000FD] focus:ring-1 focus:ring-[#0000FD] disabled:opacity-50 transition-all"
                autoFocus
              />
              {error && <p className="text-xs text-red-400 mt-1 font-medium">{error}</p>}
            </div>

            {/* Quick Suggestions */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Quick ideas (click to apply):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {POPULAR_MEAL_SUGGESTIONS.slice(0, 6).map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setMealTitle(sug);
                      if (error) setError('');
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 hover:text-white border border-zinc-800 transition-colors text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label htmlFor="meal-notes-input" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Details or Special Requests (Optional)
              </label>
              <input
                id="meal-notes-input"
                type="text"
                disabled={isSubmitting}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Extra spicy, restaurant takeaway, homemade recipe"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-all"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 disabled:opacity-50 ${
                        isSelected
                          ? 'bg-[#0000FD] text-white border border-[#0000FD]'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                      {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lock Notice Confirmation Box */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-400">
              <Lock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-200">Confirmation Rule:</span>{' '}
                Saving will visually lock this slot for <strong className="text-white">{currentUser.name}</strong>. It counts towards your weekly allocation.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
              <button
                id="cancel-meal-btn"
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-lock-meal-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#0000FD] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-[#0000FD]/30 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Locking Meal...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirm & Lock Meal</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
