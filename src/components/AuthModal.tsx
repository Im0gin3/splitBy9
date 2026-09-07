import React, { useState } from 'react';
import { Person, ClaimedProfile } from '../types';
import { Lock, KeyRound, ArrowRight, X, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  person: Person | null;
  profileStatus: ClaimedProfile | null;
  onClose: () => void;
  onSubmit: (password: string, isNewAccount: boolean) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  person,
  profileStatus,
  onClose,
  onSubmit,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !person) return null;

  const isClaimed = !!profileStatus?.claimed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    if (!isClaimed) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    try {
      setLoading(true);
      await onSubmit(password, !isClaimed);
      // Reset form on success
      setPassword('');
      setConfirmPassword('');
      setError(null);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message.includes('auth/invalid-credential') || err.message.includes('auth/wrong-password')
            ? 'Incorrect password. Please try again.'
            : err.message.includes('auth/weak-password')
            ? 'Password is too weak. Please use at least 6 characters.'
            : err.message
          : 'Authentication failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="fixed inset-0" onClick={handleClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 p-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-inner border border-white/10"
                style={{ backgroundColor: person.avatarColor }}
              >
                {person.shortName}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{person.name}</h3>
                  {isClaimed ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 flex items-center gap-1">
                      <UserCheck className="w-2.5 h-2.5" />
                      Claimed
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0000FD]/20 text-blue-300 border border-[#0000FD]/30 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      New Claim
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isClaimed
                    ? 'Enter your password to sign in'
                    : 'Create a password to claim this profile'}
                </p>
              </div>
            </div>

            <button
              id="auth-modal-close-btn"
              onClick={handleClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                <span>{isClaimed ? 'Password' : 'Create a Password'}</span>
              </label>
              <div className="relative">
                <input
                  id="auth-password-input"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isClaimed ? 'Enter your password' : 'At least 6 characters'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-[#0000FD] focus:ring-1 focus:ring-[#0000FD] text-sm text-white placeholder-zinc-400 outline-none transition-all pr-10"
                />
                <Lock className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {!isClaimed && (
                <p className="text-[11px] text-zinc-400 mt-1">
                  You will use this password every time you log in as {person.name}.
                </p>
              )}
            </div>

            {!isClaimed && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  <span>Confirm Password</span>
                </label>
                <div className="relative">
                  <input
                    id="auth-confirm-password-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-[#0000FD] focus:ring-1 focus:ring-[#0000FD] text-sm text-white placeholder-zinc-400 outline-none transition-all pr-10"
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-zinc-850 flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="auth-cancel-btn"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="auth-submit-btn"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-[#0000FD] hover:bg-blue-600 text-xs font-bold text-white transition-all shadow-md shadow-[#0000FD]/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>{isClaimed ? 'Sign In' : 'Claim & Enter'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
