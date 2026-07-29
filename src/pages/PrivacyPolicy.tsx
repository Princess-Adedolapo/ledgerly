import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Database, 
  CreditCard, 
  UserCheck, 
  Mail, 
  ArrowLeft, 
  LayoutDashboard, 
  FileText, 
  Lock, 
  CheckCircle2, 
  MessageSquare, 
  Users, 
  KanbanSquare,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Header Navigation */}
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
              <Sparkles className="w-3 h-3" /> Privacy & Data Policy
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Privacy Policy
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Transparency regarding how Ledgerly collects, processes, protects, and stores your business & client data.
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <span className="text-xs text-gray-400 dark:text-gray-500 block">Effective Date</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">July 27, 2026</span>
            </div>
          </div>
        </div>

        {/* Executive Summary / Highlights Callout Card */}
        <div className="p-6 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-white dark:via-gray-900 to-white dark:to-gray-900 shadow-xl shadow-violet-500/5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Summary of Our Commitments</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> No Third-Party Sales
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                We never monetize or sell your contact or financial data to advertisers.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                <Lock className="w-3.5 h-3.5" /> Direct Payment Security
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Card credentials are standardly handled directly by PCI-compliant payment gateways.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Database className="w-3.5 h-3.5" /> Total Data Control
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Export or request full deletion of your workspace data anytime via built-in tools or email.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Policy Document Sections */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300">
          
          {/* Section 1 */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">1. What Data We Collect</h2>
            </div>
            
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              To provide a comprehensive CRM, invoicing, and customer engagement workspace, Ledgerly collects and processes the following categories of information when you and your team use our application:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 space-y-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100 block">Contact & Client Details</span>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  Client names, phone numbers, email addresses, business names, postal addresses, and tags.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 space-y-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100 block">Invoices & Financial Records</span>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  Invoice amounts, line items, document statuses (Paid, Sent, Overdue), currency preferences, and shareable download links.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 space-y-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100 block">WhatsApp & Note Content</span>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  WhatsApp message content, conversation snippets, follow-up logs, and custom notes added to customer profiles.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 space-y-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100 block">Workflow & Deal Pipeline Status</span>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  Deal titles, stage classifications (Lead, In Progress, Won, Lost), priority levels, target values, and due dates.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <KanbanSquare className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">2. Why We Collect It (Purpose of Processing)</h2>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              We process your data strictly to deliver, maintain, and optimize the core functions of the Ledgerly CRM platform:
            </p>

            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                <span><strong className="text-gray-900 dark:text-gray-100">Contact & Customer Management:</strong> To organize clients in one centralized Customer 360 database with instant access to communication histories and tags.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                <span><strong className="text-gray-900 dark:text-gray-100">Invoicing & Billing Execution:</strong> To generate branded PDF invoices, calculate totals, issue permanent client share links, and track payment milestones.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                <span><strong className="text-gray-900 dark:text-gray-100">Pipeline & Workflow Tracking:</strong> To display interactive kanban boards and automated follow-up sequences across deal stages.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                <span><strong className="text-gray-900 dark:text-gray-100">Security & Authentication:</strong> To protect your workspace from unauthorized access via encrypted login sessions and workspace boundary rules.</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">3. Where & How Your Data is Stored</h2>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Your business and customer data is securely housed in our hosted cloud infrastructure utilizing <strong className="text-gray-900 dark:text-gray-100">Supabase (PostgreSQL)</strong>.
            </p>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Row-Level Security (RLS) Protection</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-xs">
                    Every workspace database table is isolated using strict PostgreSQL Row-Level Security rules, ensuring members of one workspace can never query or view another workspace's records.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 flex items-start gap-3">
                <Lock className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">No Selling to Third Parties</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-xs">
                    We maintain a strict stance on data ownership: <strong className="text-gray-900 dark:text-gray-100">Your data belongs to you.</strong> We do not rent, trade, sell, or disclose your client databases or communication records to any third-party brokers or advertisers.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">4. Payment Data & Processing Security</h2>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              As payment gateway integrations (such as <strong className="text-gray-900 dark:text-gray-100">Paystack</strong>, <strong className="text-gray-900 dark:text-gray-100">Flutterwave</strong>, or <strong className="text-gray-900 dark:text-gray-100">Stripe</strong>) are activated for invoice processing or subscription billing:
            </p>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <ShieldCheck className="w-4 h-4" /> Gateway Direct Processing Guarantee
              </div>
              <p className="leading-relaxed">
                All debit/credit card numbers, expiry dates, CVVs, and banking credentials are transmitted directly to PCI-DSS Level 1 certified payment processors. 
                <strong className="underline decoration-amber-500/50 ml-1">Ledgerly servers never store, inspect, or retain raw card numbers or payment credentials.</strong>
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">5. User Rights, Data Deletion & Export</h2>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              We empower you with complete control over your personal account information and business database:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 space-y-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" /> Right to Export
                </span>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  You can export your contacts, invoices, and activity logs to standard CSV files at any time via the Contacts and Invoices sections in your workspace.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 space-y-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-red-600 dark:text-red-400" /> Right to Rectify & Delete
                </span>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  You can edit or delete individual records directly. To request complete workspace erasure or account deletion, contact our privacy team.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 - Contact */}
          <section className="p-6 sm:p-8 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/10 via-white dark:via-gray-900 to-white dark:to-gray-900 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="p-2 rounded-lg bg-violet-600 text-white shadow-md shadow-violet-600/20">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">6. Contact for Privacy Inquiries</h2>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              If you have any questions, formal privacy requests, or data deletion inquiries regarding this policy, please reach out directly to our Data Protection team:
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-xs text-gray-400 dark:text-gray-500 block">Privacy & Data Inquiries</span>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">ceopano@gmail.com</span>
              </div>
              <a
                href="mailto:ceopano@gmail.com?subject=Ledgerly%20Privacy%20Inquiry"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-md shadow-violet-600/20 hover:bg-violet-500 transition-all"
              >
                <Mail className="w-4 h-4" />
                Email Privacy Officer
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
            <Link to="/privacy" className="font-semibold text-violet-600 dark:text-violet-400">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
