import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useWorkspace } from '../lib/workspace';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  LayoutDashboard,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  MailCheck,
  Wand2,
  KeyRound,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

type AuthMode = 'login' | 'signup' | 'magic_link' | 'forgot';
type SuccessState = 'signup_sent' | 'reset_sent' | 'magic_link_sent' | null;

export default function AuthPage() {
  const { signIn, signUp, signInWithMagicLink, resetPassword } = useAuth();
  const { businessName } = useWorkspace();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState<SuccessState>(null);
  const [botField, setBotField] = useState('');

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessState(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (botField) {
      setLoading(false);
      setError('Bot verification failed. Please try submitting again.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email.trim(), password);
        setLoading(false);
        if (err) {
          setError(err === '{}' ? 'An unexpected error occurred during sign in.' : err);
          return;
        }
        navigate('/dashboard');
      } else if (mode === 'signup') {
        const { error: err } = await signUp(email.trim(), password, businessNameInput);
        setLoading(false);
        if (err) {
          setError(err === '{}' ? 'An unexpected error occurred during sign up.' : err);
          return;
        }
        setSuccessState('signup_sent');
      } else if (mode === 'magic_link') {
        const { error: err } = await signInWithMagicLink(email.trim());
        setLoading(false);
        if (err) {
          setError(err);
          return;
        }
        setSuccessState('magic_link_sent');
      } else if (mode === 'forgot') {
        const { error: err } = await resetPassword(email.trim());
        setLoading(false);
        if (err) {
          setError(err);
          return;
        }
        setSuccessState('reset_sent');
      }
    } catch (err: unknown) {
      setLoading(false);
      const isErrorObj = err instanceof Error;
      const errMsg = isErrorObj ? err.message : String(err) || 'An unexpected error occurred';
      setError(errMsg === '{}' ? 'An unexpected exception occurred during authentication.' : errMsg);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-[#F8F7FF] dark:bg-[#0F0E17] flex items-center justify-center p-4 relative transition-colors duration-200"
    >
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6D5FFA] to-indigo-600 flex items-center justify-center shadow-lg shadow-[#6D5FFA]/25">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">{businessName}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Admin Portal</p>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-[#151C2C] border border-gray-200/80 dark:border-slate-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
          {/* SUCCESS STATES */}
          {successState === 'signup_sent' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 text-emerald-600 dark:text-emerald-400">
                <MailCheck className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                Verify your email
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
                We've sent a confirmation link to <strong className="font-semibold text-gray-900 dark:text-slate-200">{email}</strong>.
                Please check your inbox and click the link to verify your account.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSuccessState(null);
                  switchMode('login');
                  setEmail('');
                  setPassword('');
                  setBusinessNameInput('');
                }}
                className="w-full py-3 bg-[#6D5FFA] text-white font-semibold rounded-xl hover:bg-[#5B4EEA] transition-all shadow-lg shadow-[#6D5FFA]/25"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {successState === 'reset_sent' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5 text-[#6D5FFA] dark:text-violet-400">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                Check your inbox
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
                We've sent password reset instructions to <strong className="font-semibold text-gray-900 dark:text-slate-200">{email}</strong>.
                Click the link in the email to set your new password.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSuccessState(null);
                  switchMode('login');
                }}
                className="w-full py-3 bg-[#6D5FFA] text-white font-semibold rounded-xl hover:bg-[#5B4EEA] transition-all shadow-lg shadow-[#6D5FFA]/25"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {successState === 'magic_link_sent' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5 text-indigo-600 dark:text-indigo-400">
                <Wand2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                Magic link sent!
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
                Check your inbox at <strong className="font-semibold text-gray-900 dark:text-slate-200">{email}</strong> to sign in instantly without a password.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSuccessState(null);
                  switchMode('login');
                }}
                className="w-full py-3 bg-[#6D5FFA] text-white font-semibold rounded-xl hover:bg-[#5B4EEA] transition-all shadow-lg shadow-[#6D5FFA]/25"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* ACTIVE FORMS */}
          {!successState && (
            <>
              {/* Main Sign In / Sign Up Tabs */}
              {(mode === 'login' || mode === 'signup') && (
                <div className="flex gap-1 p-1 bg-gray-100/80 dark:bg-slate-800/60 rounded-xl mb-6">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                      mode === 'login'
                        ? 'bg-[#6D5FFA] text-white shadow-md'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                      mode === 'signup'
                        ? 'bg-[#6D5FFA] text-white shadow-md'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {/* Forgot Password Header */}
              {mode === 'forgot' && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-[#6D5FFA] dark:hover:text-violet-400 mb-3 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </button>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Reset Password</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>
              )}

              {/* Magic Link Header */}
              {mode === 'magic_link' && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-[#6D5FFA] dark:hover:text-violet-400 mb-3 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Password Sign In
                  </button>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Magic Link Sign-In</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-[#6D5FFA] dark:text-violet-400 border border-[#6D5FFA]/20">
                      <Sparkles className="w-2.5 h-2.5" /> Passwordless
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Sign in instantly with a secure link sent directly to your email.
                  </p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot field */}
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

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6D5FFA]/50 focus:border-[#6D5FFA] transition-all text-sm"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                {/* Password Field (Only for login and signup) */}
                {(mode === 'login' || mode === 'signup') && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs font-semibold text-[#6D5FFA] dark:text-violet-400 hover:underline focus:outline-none"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6D5FFA]/50 focus:border-[#6D5FFA] transition-all text-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Business Name Field for Signup */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                      Business Name <span className="text-gray-400 dark:text-slate-500 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                      <input
                        type="text"
                        value={businessNameInput}
                        onChange={(e) => setBusinessNameInput(e.target.value)}
                        maxLength={60}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6D5FFA]/50 focus:border-[#6D5FFA] transition-all text-sm"
                        placeholder="Acme Studio"
                      />
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs sm:text-sm text-red-600 dark:text-red-400 leading-relaxed">
                    {error}
                  </div>
                )}

                {/* Primary CTA Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#6D5FFA] text-white font-semibold rounded-xl hover:bg-[#5B4EEA] transition-all shadow-lg shadow-[#6D5FFA]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'magic_link' && (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Send Magic Link
                    </>
                  )}
                  {mode === 'forgot' && 'Send Reset Link'}
                </button>
              </form>

              {/* Secondary Magic Link option on Sign In mode */}
              {mode === 'login' && (
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => switchMode('magic_link')}
                    className="w-full py-2.5 px-4 bg-gray-50 dark:bg-[#192237] hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-[#6D5FFA] dark:text-violet-400" />
                    Sign in with Magic Link
                  </button>
                </div>
              )}

              {/* Password option on Magic Link mode */}
              {mode === 'magic_link' && (
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-[#6D5FFA] dark:hover:text-violet-400 transition-colors"
                  >
                    Sign in with Password instead
                  </button>
                </div>
              )}

              {/* Footer text */}
              {mode === 'signup' && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-4 text-center">
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
