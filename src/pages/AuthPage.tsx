import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useWorkspace } from '../lib/workspace';
import { LayoutDashboard, Mail, Lock, Loader2, Eye, EyeOff, Building2, MailCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { businessName } = useWorkspace();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [botField, setBotField] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (botField) {
      // Automated bot detected via honeypot field
      setLoading(false);
      setError('Bot verification failed. Please try submitting again.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error } =
        mode === 'login'
          ? await signIn(email.trim(), password)
          : await signUp(email.trim(), password, businessNameInput);
      setLoading(false);
      if (error) {
        console.error('[AuthPage] Authentication error:', error);
        setError(error === '{}' ? 'An unexpected authentication error occurred.' : error);
        return;
      }
      if (mode === 'signup') {
        setSignupSuccess(true);
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      setLoading(false);
      console.error('[AuthPage] Authentication exception:', err);
      const isErrorObj = err instanceof Error;
      const errMsg = isErrorObj ? err.message : (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err)) || 'An unexpected error occurred';
      setError(errMsg === '{}' ? 'An unexpected exception occurred during authentication.' : errMsg);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{businessName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Admin Portal</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-2xl">
          {signupSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                <MailCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Verify your email
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                We've sent a confirmation link to <span className="font-medium text-gray-900 dark:text-gray-100">{email}</span>.
                Please check your inbox and spam folder, then click the link to verify your address.
              </p>
              <button
                onClick={() => {
                  setSignupSuccess(false);
                  setMode('login');
                  setEmail('');
                  setPassword('');
                  setBusinessNameInput('');
                }}
                className="w-full py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-500 transition-all shadow-lg shadow-violet-600/20"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg mb-6">
                <button
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    mode === 'login'
                      ? 'bg-violet-600 text-white shadow-lg'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    mode === 'signup'
                      ? 'bg-violet-600 text-white shadow-lg'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot field for bot protection - hidden visually from genuine human users */}
                <div style={{ display: 'none' }} aria-hidden="true">
                  <label htmlFor="confirm_website_hp">Do not fill this field</label>
                  <input
                    id="confirm_website_hp"
                    type="text"
                    name="confirm_website_hp"
                    tabIndex={-1}
                    value={botField}
                    onChange={(e) => setBotField(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Business Name <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={businessNameInput}
                        onChange={(e) => setBusinessNameInput(e.target.value)}
                        maxLength={60}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                        placeholder="Acme Studio"
                      />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                      Shown in your sidebar. You can change this anytime in Settings.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-500 transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              {mode === 'signup' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
                  After signing up, check your inbox to verify your email address.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
