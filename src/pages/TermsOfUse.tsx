import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  CreditCard,
  UserCheck,
  AlertTriangle,
  Scale,
  Ban,
  ArrowLeft,
  LayoutDashboard,
  Lock,
  CheckCircle2,
  Mail,
  Sparkles,
  ExternalLink,
  Clock,
  RefreshCw
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth';

export default function TermsOfUse() {
  const navigate = useNavigate();
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Sticky Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/20 group-hover:scale-105 transition-transform">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Ledgerly</span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <Sparkles className="w-3 h-3" /> Legal & Terms
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {session ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-violet-600/20 hover:bg-violet-500 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-violet-600/20 hover:bg-violet-500 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Document Body */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {/* Back Link & Title */}
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Terms of Use
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                The agreement governing your access to Ledgerly workspaces, billing tools, client portals, and CRM features.
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <span className="text-xs text-gray-400 dark:text-gray-500 block">Last Updated</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">September 2026</span>
            </div>
          </div>
        </div>

        {/* Highlight Callout Cards */}
        <div className="p-6 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-white dark:via-gray-900 to-white dark:to-gray-900 shadow-xl shadow-violet-500/5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/20">
              <Scale className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Summary for Teams</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> You Own Your Data
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                You retain complete ownership of your contacts, invoices, deals, and workspace assets.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                <CreditCard className="w-3.5 h-3.5" /> Paystack Secured
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                All subscriptions and billing are encrypted and processed through PCI-DSS certified Paystack gateways.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Cancel Anytime
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                No locked-in long-term commitments. Cancel or export your workspace data whenever you choose.
              </p>
            </div>
          </div>
        </div>

        {/* Structured Legal Sections */}
        <div className="space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">

          {/* Section 1: Service Overview */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">1. Service Overview</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">Platform scope and application terms</span>
              </div>
            </div>

            <p>
              Welcome to <strong className="text-gray-900 dark:text-white">Ledgerly</strong>. These Terms of Use (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;, or &quot;Customer&quot;) and Ledgerly (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            </p>
            <p>
              Ledgerly provides a cloud-based software-as-a-service (SaaS) business management platform featuring customer relationship management (CRM), interactive workflow and pipeline boards, invoice and proposal generation, client portal links, payment facilitation, and collaborative team workspace tools (collectively, the &quot;Service&quot;).
            </p>
            <p>
              By accessing, browsing, registering for, or using our Service, you confirm that you have read, understood, and agree to be bound by these Terms and our companion{' '}
              <Link to="/privacy" className="text-violet-600 dark:text-violet-400 underline hover:text-violet-500 font-medium">
                Privacy Policy
              </Link>
              . If you are entering into these Terms on behalf of an entity or organization, you represent and warrant that you possess full legal authority to bind that entity.
            </p>
          </section>

          {/* Section 2: User Accounts & Registration */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">2. User Accounts & Workspace Security</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">Credentials, permissions, and organization roles</span>
              </div>
            </div>

            <ul className="space-y-3 list-disc pl-5 text-gray-600 dark:text-gray-300">
              <li>
                <strong className="text-gray-900 dark:text-white">Account Creation:</strong> You must provide accurate, current, and complete information during registration and keep your account profile updated.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">Credential Confidentiality:</strong> You are solely responsible for safeguarding your login credentials (passwords, magic authentication links, and recovery tokens). You must immediately notify Ledgerly of any suspected unauthorized access or security breach.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">Workspace Permissions & Invites:</strong> Workspace owners and administrators have authority to invite team members, assign role-based access permissions, view audit logs, and configure workspace settings. All actions performed by invited members are attributable to the host workspace account.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">Age Eligibility:</strong> The Service is intended exclusively for individuals aged 18 or older operating lawful commercial, professional, or organizational activities.
              </li>
            </ul>
          </section>

          {/* Section 3: Subscriptions & Payments (via Paystack) */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">3. Subscriptions & Payments (via Paystack)</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">Billing cadence, payment processing, renewals, and refunds</span>
              </div>
            </div>

            <div className="space-y-3">
              <p>
                Ledgerly offers tiered subscription plans, custom add-ons, and payment processing services. By selecting a paid subscription or processing payments through our invoicing module:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                <div className="p-3.5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 space-y-1">
                  <span className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" /> Paystack Gateway Integration
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    All payment card transactions, debit orders, mobile money, and invoice settlement checkouts are processed directly by <strong>Paystack Payments Limited</strong>. Ledgerly never stores full credit card numbers or security CVV codes on our servers.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 space-y-1">
                  <span className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-violet-500" /> Automatic Renewal & Invoicing
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Paid subscriptions automatically renew at the conclusion of each billing cycle (monthly or annually) unless canceled prior to the renewal date in your Workspace Settings.
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5 list-disc pl-5 text-gray-600 dark:text-gray-300 pt-2">
                <li>
                  <strong className="text-gray-900 dark:text-white">Taxes & Fees:</strong> Subscription charges are exclusive of value-added taxes (VAT) or sales taxes where applicable, which will be calculated and displayed during checkout.
                </li>
                <li>
                  <strong className="text-gray-900 dark:text-white">Client Invoice Facilitation:</strong> When you issue invoices to your end-clients via Ledgerly and Paystack, you are solely responsible for ensuring the underlying goods or services rendered comply with all local tax and commerce regulations.
                </li>
                <li>
                  <strong className="text-gray-900 dark:text-white">Refund Policy:</strong> Except where required by applicable consumer law, subscription fees are non-refundable once billed. If you cancel mid-cycle, you maintain full platform access until the end of your prepaid period.
                </li>
                <li>
                  <strong className="text-gray-900 dark:text-white">Failed Payments & Delinquency:</strong> If a scheduled charge fails via Paystack, Ledgerly will attempt re-billing according to standard retry policies. Persistent non-payment may result in downgrade to a free tier or temporary suspension of premium features.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4: Data Ownership & Acceptable Use */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">4. Data Ownership & Acceptable Use</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">Intellectual property, proprietary rights, and forbidden conduct</span>
              </div>
            </div>

            <div className="space-y-3">
              <p>
                <strong className="text-gray-900 dark:text-white">Your Proprietary Content:</strong> You retain all ownership rights, copyright, and intellectual property interests in the customer data, contacts, line-items, notes, and records you upload to Ledgerly. You grant Ledgerly a limited, non-exclusive license solely to host, transmit, process, and back up your data to provide the Service to you and your team.
              </p>

              <p>
                <strong className="text-gray-900 dark:text-white">Acceptable Use Policy:</strong> You agree NOT to, and will not permit any third party to:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-gray-700 dark:text-gray-300">
                  <Ban className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>Send unsolicited commercial communications (SPAM), deceptive invoices, phishing links, or fraudulent billing claims.</span>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-gray-700 dark:text-gray-300">
                  <Ban className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>Reverse-engineer, decompile, disassemble, or extract source code from Ledgerly platform bundles or client portals.</span>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-gray-700 dark:text-gray-300">
                  <Ban className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>Interfere with or compromise system integrity, security safeguards, rate limits, or network infrastructure.</span>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-gray-700 dark:text-gray-300">
                  <Ban className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>Harvest, scrape, or extract personal information of third parties without their documented, verified legal consent.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Limitation of Liability */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">5. Limitation of Liability & Warranty Disclaimers</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">Legal boundaries, warranties, and liability caps</span>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              <p>
                <strong className="text-gray-900 dark:text-white">Provided &quot;As-Is&quot;:</strong> Ledgerly and all associated features are provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express, statutory, or implied, including merchantability, fitness for a specific commercial purpose, and non-infringement.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">No Consequential Damages:</strong> To the maximum extent permitted by applicable law, in no event shall Ledgerly, its officers, employees, or software providers be liable for any indirect, incidental, special, punitive, exemplary, or consequential damages (including loss of profits, goodwill, data corruption, or business interruption).
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">Aggregate Monetary Cap:</strong> In all circumstances, Ledgerly&apos;s total cumulative liability arising out of or related to the Service shall not exceed the actual fees paid by you to Ledgerly during the twelve (12) month period immediately preceding the event giving rise to liability.
              </p>
            </div>
          </section>

          {/* Section 6: Account Termination */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">6. Account Termination & Cancellation</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">Ending your agreement, export windows, and data purging</span>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              <p>
                <strong className="text-gray-900 dark:text-white">Termination by You:</strong> You may cancel your subscription or terminate your account at any time via your workspace profile settings or by contacting our team. Cancellation halts future billing immediately.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">Termination or Suspension by Ledgerly:</strong> We reserve the right to suspend or terminate accounts that breach these Terms, participate in unauthorized or fraudulent billing activities, or fail to resolve billing delinquency.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">Data Export & Retention:</strong> Upon account closure, you may request an export of your CRM and invoicing data within thirty (30) calendar days. Following this period, your workspace data will be queued for permanent deletion in accordance with our retention policy.
              </p>
            </div>
          </section>

          {/* Section 7: Contact & Questions */}
          <section className="p-6 sm:p-8 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/10 via-white dark:via-gray-900 to-white dark:to-gray-900 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-violet-600 text-white shadow-md shadow-violet-600/20">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">7. Legal Inquiries & Governance</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">Contact our legal team with inquiries or notices</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              For legal inquiries, contract clarifications, or formal notices regarding these Terms of Use, please contact us:
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-xs text-gray-400 dark:text-gray-500 block">Ledgerly Legal Support</span>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">ceopano@gmail.com</span>
              </div>
              <a
                href="mailto:ceopano@gmail.com?subject=Ledgerly%20Terms%20Inquiry"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-md shadow-violet-600/20 hover:bg-violet-500 transition-all"
              >
                <Mail className="w-4 h-4" />
                Contact Legal
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 bg-white dark:bg-gray-900/60 transition-colors">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 text-xs text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Ledgerly. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">Home</Link>
            <Link to="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">Dashboard</Link>
            <Link to="/invoices" className="hover:text-gray-900 dark:hover:text-white transition-colors">Invoices</Link>
            <Link to="/terms" className="font-semibold text-violet-600 dark:text-violet-400">Terms of Use</Link>
            <Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
