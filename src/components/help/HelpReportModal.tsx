import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  HelpCircle,
  Bug,
  CreditCard,
  UserCheck,
  MessageSquare,
  AlertTriangle,
  UploadCloud,
  ExternalLink,
  Send,
  Loader2,
  Trash2,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useWorkspace } from '../../lib/workspace';
import { useToast } from '../../contexts/ToastContext';
import { useActivityLog } from '../../contexts/ActivityLogContext';
import { supabase } from '../../integrations/supabase/client';
import { SupportCategory, SupportPriority } from '../../lib/supabase';

interface HelpReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: SupportCategory;
}

const CATEGORIES: Array<{
  id: SupportCategory;
  label: string;
  icon: typeof Bug;
  desc: string;
}> = [
  {
    id: 'Technical Bug',
    label: 'Technical Bug',
    icon: Bug,
    desc: 'Errors, glitches, broken buttons, or page issues',
  },
  {
    id: 'Billing & Payments',
    label: 'Billing & Payments',
    icon: CreditCard,
    desc: 'Paystack checkouts, subscription tiers, invoice charges',
  },
  {
    id: 'Account Setup',
    label: 'Account Setup',
    icon: UserCheck,
    desc: 'Logins, invites, workspace permissions, profile settings',
  },
  {
    id: 'General Inquiry',
    label: 'General Inquiry',
    icon: MessageSquare,
    desc: 'Questions, feedback, or custom feature requests',
  },
];

export function HelpReportModal({
  isOpen,
  onClose,
  defaultCategory = 'Technical Bug',
}: HelpReportModalProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { addToast } = useToast();
  const { logActivity } = useActivityLog();

  const [category, setCategory] = useState<SupportCategory>(defaultCategory);
  const [priority, setPriority] = useState<SupportPriority>('normal');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string; sizeKb: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill email from logged-in user
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Sync category if defaultCategory prop changes
  useEffect(() => {
    if (defaultCategory) {
      setCategory(defaultCategory);
    }
  }, [defaultCategory]);

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const currentRoute = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
  const screenDimensions = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A';
  const userAgentStr = typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A';

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Only image files (.png, .jpg, .jpeg, .webp) are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setAttachment({
          name: file.name,
          dataUrl: e.target.result,
          sizeKb: Math.round(file.size / 1024),
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMessage = message.trim();

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid contact email address.');
      return;
    }

    if (trimmedMessage.length < 5) {
      setErrorMsg('Please provide a descriptive message (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);

    const diagnosticsPayload = includeDiagnostics
      ? {
          route: currentRoute,
          workspace_id: currentWorkspace?.id || null,
          screen: screenDimensions,
          userAgent: userAgentStr,
          attachment_name: attachment?.name || null,
          attachment_data: attachment?.dataUrl || null,
        }
      : {
          attachment_name: attachment?.name || null,
          attachment_data: attachment?.dataUrl || null,
        };

    const severity = priority; // 'normal' | 'urgent' (severity level)
    const contact_email = trimmedEmail;
    const user_message = trimmedMessage;

    try {
      // 1. DATABASE INTEGRATION:
      // Insert a new record into `support_tickets` mapping:
      // * category -> category
      // * severity -> severity level
      // * contact_email -> contact email
      // * message -> user message text
      const { error: dbError } = await supabase
        .from('support_tickets')
        .insert([
          {
            category,
            severity,
            contact_email,
            message: user_message,
            status: 'open',
          },
        ]);

      if (dbError) {
        console.error('[Support Ticket DB Insert Error]:', dbError);
        throw new Error(dbError.message || 'Failed to save support ticket to database. Please try again.');
      }

      // 2. Server-side notification dispatch (email to ceopano@gmail.com & telemetry)
      try {
        await fetch('/api/support/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            severity,
            contact_email,
            message: user_message,
            user_email: contact_email,
            priority: severity,
            metadata: diagnosticsPayload,
            status: 'open',
          }),
        });
      } catch (dispatchErr) {
        console.warn('[Support Ticket] Background server notification notice:', dispatchErr);
      }

      // 3. Log into local workspace activity log for auditability
      try {
        logActivity(
          'status',
          `Support ticket submitted (${category}${severity === 'urgent' ? ' - Urgent' : ''}): "${user_message.slice(0, 45)}..."`
        );
      } catch {
        // non-blocking
      }

      // 4. Show success toast notification only after the database insert succeeds
      addToast('success', 'Message Sent', "Message sent! We'll get back to you shortly.");

      // Reset form & close
      setMessage('');
      setAttachment(null);
      setPriority('normal');
      onClose();
    } catch (err) {
      console.error('[Support Report Submission Error]:', err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to submit report right now. Please try again or email us directly at ceopano@gmail.com.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="help-report-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-report-modal-title"
    >
      <div
        id="help-report-modal-content"
        className="relative w-full max-w-xl bg-white dark:bg-[#151C2C] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col transition-all duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/80 dark:border-slate-800/80 bg-gray-50/70 dark:bg-[#111625]/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="help-report-modal-title"
                className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100"
              >
                Need help or found a bug?
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Send our team a message. We review incoming tickets promptly.
              </p>
            </div>
          </div>
          <button
            id="help-report-modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close help modal"
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Quick Help & Legal Links Banner */}
          <div className="p-3.5 rounded-xl bg-violet-50/70 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-violet-900 dark:text-violet-300">
              <Info className="w-4 h-4 shrink-0 text-violet-600 dark:text-violet-400" />
              <span>Looking for policies or direct email?</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-700 dark:text-violet-400 hover:underline flex items-center gap-1"
              >
                Terms of Use <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-gray-300 dark:text-slate-700">•</span>
              <a
                href="mailto:ceopano@gmail.com"
                className="text-violet-700 dark:text-violet-400 hover:underline"
              >
                ceopano@gmail.com
              </a>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          <form id="help-report-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Category selection */}
            <div>
              <label
                htmlFor="help-category-select"
                className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50/60 dark:bg-violet-950/30 text-violet-900 dark:text-violet-200 shadow-xs'
                          : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-[#111625] text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{cat.label}</div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-1">
                          {cat.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority / Severity Level */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Severity Level
                </label>
                <span className="text-[11px] text-gray-400">
                  Mark urgent if preventing core business operations
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                    priority === 'normal'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                      : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  Normal Priority
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    priority === 'urgent'
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold'
                      : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  Urgent / Blocker
                </button>
              </div>
            </div>

            {/* Contact Email Input */}
            <div>
              <label
                htmlFor="help-email-input"
                className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Contact Email <span className="text-red-500">*</span>
              </label>
              <input
                id="help-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="your.email@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#111625] text-gray-900 dark:text-slate-100 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
              />
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                We will send status updates and solutions to this address.
              </p>
            </div>

            {/* Message Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="help-message-textarea"
                  className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider"
                >
                  Describe What Happened <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  {message.length}/5000 characters
                </span>
              </div>
              <textarea
                id="help-message-textarea"
                required
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Describe what happened, what you expected to see, or any steps to reproduce..."
                maxLength={5000}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#111625] text-gray-900 dark:text-slate-100 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all resize-none"
              />
            </div>

            {/* Screenshot / Attachment Uploader */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Attach Screenshot (Optional)
              </label>

              {attachment ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={attachment.dataUrl}
                      alt="Attachment preview"
                      className="w-10 h-10 rounded-lg object-cover border border-violet-200 dark:border-violet-800"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-slate-100 truncate">
                        {attachment.name}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">
                        {attachment.sizeKb} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    aria-label="Remove screenshot"
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30'
                      : 'border-gray-200 dark:border-slate-800 hover:border-violet-400/60 dark:hover:border-violet-600/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
                    }}
                  />
                  <div className="flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-slate-400">
                    <UploadCloud className="w-5 h-5 text-violet-500" />
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Drag & drop image here, or{' '}
                      <span className="text-violet-600 dark:text-violet-400 underline">browse</span>
                    </span>
                    <span className="text-[10px] text-gray-400">PNG, JPG, or WebP up to 5MB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Diagnostic Telemetry Accordion & Toggle */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#111625] border border-gray-200/80 dark:border-slate-800/80 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeDiagnostics}
                  onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 border-gray-300 dark:border-slate-700"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                  Include technical context (route, resolution & browser)
                </span>
              </label>

              {includeDiagnostics && (
                <div className="text-[11px] text-gray-500 dark:text-slate-400 pt-1.5 border-t border-gray-200/50 dark:border-slate-800/50 grid grid-cols-2 gap-x-2 gap-y-1 font-mono">
                  <div className="truncate">
                    <span className="text-gray-400 font-sans">Route:</span> {currentRoute}
                  </div>
                  <div className="truncate">
                    <span className="text-gray-400 font-sans">Screen:</span> {screenDimensions}
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || message.trim().length < 5}
                id="help-report-submit-btn"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md shadow-violet-500/20 hover:shadow-violet-500/35 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
