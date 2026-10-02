import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useWorkspace } from '../lib/workspace';
import { ThemeToggle } from '../components/ThemeToggle';
import { LayoutDashboard, Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UpdatePasswordPage() {
  const { updatePassword } = useAuth();
  const { businessName } = useWorkspace();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: updateErr } = await updatePassword(password);
      setLoading(false);
      if (updateErr) {
        setError(updateErr);
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setLoading(false);
      const isErrorObj = err instanceof Error;
      setError(isErrorObj ? err.message : 'Failed to update password.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-[#F8F7FF] dark:bg-[#0F0F12] flex items-center justify-center p-4 relative transition-colors duration-200"
    >
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-indigo-600 flex items-center justify-center shadow-lg shadow-[#7C5CFC]/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{businessName}</h1>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">Password Reset</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#18181F] border border-gray-200 dark:border-[#2A2A36] rounded-2xl p-8 shadow-xl">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Password Updated!
              </h2>
              <p className="text-sm text-gray-500 dark:text-[#9CA3AF] mb-6">
                Your password has been changed successfully. You can now access your account.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 bg-[#7C5CFC] text-white font-semibold rounded-xl hover:bg-[#6C4AEB] transition-all shadow-lg shadow-[#7C5CFC]/25"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set new password</h2>
                <p className="text-sm text-gray-500 dark:text-[#9CA3AF] mt-1">
                  Please enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#9CA3AF]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-[#121217] border border-gray-200 dark:border-[#2A2A36] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#9CA3AF]/60 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/40 focus:border-[#7C5CFC] transition-all text-sm"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#9CA3AF] hover:text-gray-600 dark:hover:text-white focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#9CA3AF]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-[#121217] border border-gray-200 dark:border-[#2A2A36] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#9CA3AF]/60 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC]/40 focus:border-[#7C5CFC] transition-all text-sm"
                      placeholder="Repeat your new password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#7C5CFC] text-white font-semibold rounded-xl hover:bg-[#6C4AEB] transition-all shadow-lg shadow-[#7C5CFC]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
