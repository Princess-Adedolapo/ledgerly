import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getErrorMessage } from '../lib/errorUtils';
import {
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
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';

type AuthMode = 'login' | 'signup' | 'magic_link' | 'forgot';
type SuccessState = 'signup_sent' | 'reset_sent' | 'magic_link_sent' | null;

function LedgerlyLogomark({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ledgerly logo"
    >
      <rect
        x="2.5"
        y="2.5"
        width="22"
        height="22"
        rx="5"
        stroke="#6C5CE7"
        strokeWidth="3.2"
        fill="none"
      />
      <rect
        x="31.5"
        y="2.5"
        width="22"
        height="22"
        rx="5"
        stroke="#6C5CE7"
        strokeWidth="3.2"
        fill="none"
      />
      <rect
        x="2.5"
        y="31.5"
        width="22"
        height="22"
        rx="5"
        stroke="#6C5CE7"
        strokeWidth="3.2"
        fill="none"
      />
      <rect
        x="31.5"
        y="31.5"
        width="22"
        height="22"
        rx="5"
        stroke="#6C5CE7"
        strokeWidth="3.2"
        fill="none"
      />
    </svg>
  );
}

export default function AuthPage() {
  const { signIn, signUp, signInWithMagicLink, resetPassword } = useAuth();
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

  const passwordRules = [
    {
      id: 'min-length',
      label: 'Minimum 8 characters',
      met: password.length >= 8,
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'number',
      label: 'At least one number (0-9)',
      met: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'At least one special symbol (!@#$%^&*)',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const allRulesMet = passwordRules.every((r) => r.met);

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
          const rawErr = err || '';
          if (
            rawErr.toLowerCase().includes('invalid login credentials') ||
            rawErr.toLowerCase().includes('invalid credentials')
          ) {
            setError(
              "Incorrect email or password. Please double-check your credentials, click 'Forgot password?' to reset your password, or switch to 'Sign Up' if you don't have an account yet."
            );
          } else {
            setError(rawErr === '{}' ? 'An unexpected error occurred during sign in.' : rawErr);
          }
          return;
        }
        navigate('/dashboard');
      } else if (mode === 'signup') {
        if (!allRulesMet) {
          setLoading(false);
          const unmet = passwordRules.filter((r) => !r.met).map((r) => r.label);
          setError(`Password does not meet all requirements: ${unmet.join(', ')}.`);
          return;
        }
        const { error: err } = await signUp(email.trim(), password, businessNameInput);
        setLoading(false);
        if (err) {
          let displayError = err === '{}' ? 'An unexpected error occurred during sign up.' : err;
          const lower = displayError.toLowerCase();
          if (lower.includes('password') || lower.includes('weak') || lower.includes('characters')) {
            const unmet = passwordRules.filter((r) => !r.met).map((r) => r.label);
            if (unmet.length > 0) {
              displayError = `Password requirement not met: ${unmet.join('; ')}.`;
            } else {
              displayError = 'Password is not strong enough. Please ensure it contains at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special symbol (!@#$%^&*).';
            }
          }
          setError(displayError);
          return;
        }
        setSuccessState('signup_sent');
      } else if (mode === 'magic_link') {
        const { error: err } = await signInWithMagicLink(email.trim());
        setLoading(false);
        if (err) {
          setError(
            getErrorMessage(
              err,
              "Unable to send magic link. Please verify your email, wait a moment, or try 'Forgot password' to reset your credentials."
            )
          );
          return;
        }
        setSuccessState('magic_link_sent');
      } else if (mode === 'forgot') {
        const { error: err } = await resetPassword(email.trim());
        setLoading(false);
        if (err) {
          setError(
            getErrorMessage(
              err,
              'Unable to send password reset email. Please verify your email address and try again in a few moments.'
            )
          );
          return;
        }
        setSuccessState('reset_sent');
      }
    } catch (err: unknown) {
      setLoading(false);
      setError(
        getErrorMessage(
          err,
          mode === 'magic_link'
            ? "Unable to send magic link. Please verify your email, wait a moment, or try 'Forgot password' to reset your credentials."
            : 'An unexpected exception occurred during authentication.'
        )
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="min-h-screen md:h-screen w-full flex flex-col md:grid md:grid-cols-[45%_55%] bg-[#FAFAFA] text-gray-900"
    >
      {/* Left Column / Brand Panel (~45% width) */}
      <div className="w-full bg-[#110C24] text-white flex flex-col shrink-0 md:h-full relative overflow-hidden">
        {/* Decorative background element: oversized watermark echo of the logomark */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute w-[320px] h-[320px] rotate-[14deg] opacity-[0.09] pointer-events-none z-0 select-none"
          style={{ top: '-10%', right: '-15%' }}
        >
          <LedgerlyLogomark
            size={320}
            className="w-[320px] h-[320px]"
          />
        </div>

        {/* Mobile View (< 768px): Compact header with logomark + one-line headline only, no graphic */}
        <div className="md:hidden px-5 py-4 flex items-center gap-3 border-b border-white/10 relative z-10">
          <LedgerlyLogomark
            size={36}
            className="w-[36px] h-[36px] shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white tracking-tight truncate">
              Run your business like it's already grown up
            </h1>
          </div>
        </div>

        {/* Desktop View (>= 768px): Brand panel with logo, headline, subheading, and upward polyline stat */}
        <div className="hidden md:flex md:flex-col md:items-center md:justify-center h-full p-10 lg:p-14 xl:p-16 relative z-10">
          <div className="w-full max-w-md my-auto flex flex-col justify-center">
            {/* Top section */}
            <div>
              <div className="mb-10 lg:mb-12">
                <LedgerlyLogomark
                  size={56}
                  className="w-[56px] h-[56px]"
                />
              </div>

              <div className="space-y-4">
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                  Run your business like it's already grown up
                </h1>
                <p className="text-sm lg:text-base text-gray-300 leading-relaxed">
                  Contacts, invoices, and your workflow, in any currency, all in one workspace.
                </p>
              </div>
            </div>

            {/* Bottom section: SVG line graphic (teal upward polyline) + stat sitting directly on dark background */}
            <div className="mt-14 space-y-3">
              <div className="w-full max-w-[280px] flex items-center">
                <svg
                  viewBox="0 0 200 36"
                  className="w-[280px] h-[42px] -ml-[30px] pl-0 overflow-visible"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <polyline
                    points="4,28 36,23 68,27 104,14 136,17 190,4"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ borderStyle: 'solid' }}
                  />
                  <circle cx="190" cy="4" r="3.5" fill="#10B981" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-purple-200/90 tracking-tight">
                  ₦2.4m tracked this month
                </div>
                <div className="text-xs text-gray-400">
                  Sample workspace activity
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column (~55% width): background #FAFAFA */}
      <div className="w-full bg-[#FAFAFA] flex flex-col items-center justify-center p-6 sm:p-10 lg:p-16 overflow-y-auto md:h-full">
        <div className="w-full max-w-md my-auto py-4">
          {/* SUCCESS STATES */}
          {successState === 'signup_sent' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5 text-emerald-600">
                <MailCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verify your email
              </h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                We've sent a confirmation link to <strong className="font-semibold text-gray-900">{email}</strong>.
                Please check your inbox and click the link to verify your account.
              </p>
              <button
                type="button"
                id="auth-back-to-login-signup-sent"
                onClick={() => {
                  setSuccessState(null);
                  switchMode('login');
                  setEmail('');
                  setPassword('');
                  setBusinessNameInput('');
                }}
                className="w-full py-2.5 bg-[#6C5CE7] text-white font-semibold rounded-[8px] hover:bg-[#5b4cdb] transition-all shadow-sm"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {successState === 'reset_sent' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center mx-auto mb-5 text-[#6C5CE7]">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Check your inbox
              </h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                We've sent password reset instructions to <strong className="font-semibold text-gray-900">{email}</strong>.
                Click the link in the email to set your new password.
              </p>
              <button
                type="button"
                id="auth-back-to-login-reset-sent"
                onClick={() => {
                  setSuccessState(null);
                  switchMode('login');
                }}
                className="w-full py-2.5 bg-[#6C5CE7] text-white font-semibold rounded-[8px] hover:bg-[#5b4cdb] transition-all shadow-sm"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {successState === 'magic_link_sent' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-5 text-indigo-600">
                <Wand2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Magic link sent!
              </h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Check your inbox at <strong className="font-semibold text-gray-900">{email}</strong> to sign in instantly without a password.
              </p>
              <button
                type="button"
                id="auth-back-to-login-magic-sent"
                onClick={() => {
                  setSuccessState(null);
                  switchMode('login');
                }}
                className="w-full py-2.5 bg-[#6C5CE7] text-white font-semibold rounded-[8px] hover:bg-[#5b4cdb] transition-all shadow-sm"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* ACTIVE FORMS */}
          {!successState && (
            <>
              {/* Main Sign In / Sign Up Underline Tabs */}
              {(mode === 'login' || mode === 'signup') && (
                <div className="flex border-b border-gray-200 mb-8 gap-8">
                  <button
                    type="button"
                    id="auth-tab-login"
                    onClick={() => switchMode('login')}
                    className={`pb-3 text-base transition-colors relative ${
                      mode === 'login'
                        ? 'font-medium text-gray-900 border-b-2 border-[#6C5CE7] -mb-[1px]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    id="auth-tab-signup"
                    onClick={() => switchMode('signup')}
                    className={`pb-3 text-base transition-colors relative ${
                      mode === 'signup'
                        ? 'font-medium text-gray-900 border-b-2 border-[#6C5CE7] -mb-[1px]'
                        : 'text-gray-500 hover:text-gray-700'
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
                    id="auth-back-to-login-forgot"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#6C5CE7] mb-3 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </button>
                  <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>
              )}

              {/* Magic Link Header */}
              {mode === 'magic_link' && (
                <div className="mb-6">
                  <button
                    type="button"
                    id="auth-back-to-login-magic"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#6C5CE7] mb-3 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Password Sign In
                  </button>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-gray-900">Magic Link Sign-In</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-[#6C5CE7] border border-[#6C5CE7]/20">
                      <Sparkles className="w-2.5 h-2.5" /> Passwordless
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[8px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all text-sm"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                {/* Password Field (Only for login and signup) */}
                {(mode === 'login' || mode === 'signup') && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          id="auth-forgot-password-link"
                          onClick={() => switchMode('forgot')}
                          className="text-xs font-semibold text-[#6C5CE7] hover:underline focus:outline-none"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={mode === 'signup' ? 8 : 6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-[8px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all text-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* LIVE PASSWORD STRENGTH HELPER (Strictly on Sign Up tab) */}
                    {mode === 'signup' && (
                      <div className="mt-2.5 p-3 rounded-[8px] bg-gray-50/90 border border-gray-200/80">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700">Password requirements</span>
                          <span className={`text-[11px] font-medium transition-colors ${allRulesMet ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
                            {passwordRules.filter((r) => r.met).length} of 5 met
                          </span>
                        </div>
                        <ul className="space-y-1.5" aria-label="Password criteria">
                          {passwordRules.map((rule) => (
                            <li
                              key={rule.id}
                              className={`flex items-center gap-2 text-xs transition-colors duration-150 ${
                                rule.met ? 'text-emerald-700 font-medium' : 'text-gray-500'
                              }`}
                            >
                              {rule.met ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2.5} />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0 mx-1" />
                              )}
                              <span>{rule.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Business Name Field for Signup */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Business Name <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={businessNameInput}
                        onChange={(e) => setBusinessNameInput(e.target.value)}
                        maxLength={60}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[8px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all text-sm"
                        placeholder="Acme Studio"
                      />
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div
                    role="alert"
                    className="bg-red-50/95 border border-red-200/90 rounded-[8px] p-3.5 text-xs sm:text-sm text-red-700 leading-relaxed font-normal shadow-sm"
                  >
                    {error.includes("Forgot password?") && error.includes("Sign Up") ? (
                      <div>
                        <span>Incorrect email or password. Please double-check your credentials, click </span>
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="font-semibold underline hover:text-red-900 focus:outline-none cursor-pointer"
                        >
                          'Forgot password?'
                        </button>
                        <span> to reset your password, or switch to </span>
                        <button
                          type="button"
                          onClick={() => switchMode('signup')}
                          className="font-semibold underline hover:text-red-900 focus:outline-none cursor-pointer"
                        >
                          'Sign Up'
                        </button>
                        <span> if you don't have an account yet.</span>
                      </div>
                    ) : error.includes("'Forgot password'") ? (
                      <div>
                        <span>{error.split("'Forgot password'")[0]}</span>
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="font-semibold underline hover:text-red-900 focus:outline-none cursor-pointer"
                        >
                          'Forgot password'
                        </button>
                        <span>{error.split("'Forgot password'")[1] || ''}</span>
                      </div>
                    ) : (
                      error
                    )}
                  </div>
                )}

                {/* Primary CTA Button */}
                <button
                  type="submit"
                  id="auth-submit-btn"
                  disabled={loading || (mode === 'signup' && !allRulesMet)}
                  className="w-full py-2.5 bg-[#6C5CE7] text-white font-semibold rounded-[8px] hover:bg-[#5b4cdb] transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-3"
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

                {/* Micro-text beneath primary submit button on Sign Up */}
                {mode === 'signup' && (
                  <p className="text-xs text-gray-500 text-center mt-3 leading-relaxed">
                    By signing up, you agree to our{' '}
                    <Link
                      to="/terms"
                      className="text-[#6C5CE7] font-medium underline hover:text-[#5b4cdb] transition-colors"
                    >
                      Terms of Use
                    </Link>{' '}
                    and{' '}
                    <Link
                      to="/privacy"
                      className="text-[#6C5CE7] font-medium underline hover:text-[#5b4cdb] transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                )}
              </form>

              {/* Secondary Magic Link option on Sign In mode */}
              {mode === 'login' && (
                <div className="mt-6 pt-5 border-t border-gray-200 text-center">
                  <button
                    type="button"
                    id="auth-magic-link-btn"
                    onClick={() => switchMode('magic_link')}
                    className="w-full py-2.5 px-4 bg-transparent hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-[8px] border border-gray-300 transition-all flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-[#6C5CE7]" />
                    Sign in with Magic Link
                  </button>
                </div>
              )}

              {/* Password option on Magic Link mode */}
              {mode === 'magic_link' && (
                <div className="mt-6 pt-5 border-t border-gray-200 text-center">
                  <button
                    type="button"
                    id="auth-password-instead-btn"
                    onClick={() => switchMode('login')}
                    className="text-xs font-semibold text-gray-500 hover:text-[#6C5CE7] transition-colors"
                  >
                    Sign in with Password instead
                  </button>
                </div>
              )}

              {/* Footer text */}
              {mode === 'signup' && (
                <p className="text-xs text-gray-500 mt-4 text-center">
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
