import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X, Sparkles, ArrowRight } from 'lucide-react';
import { Card } from './ui';

type Step = {
  id: string;
  label: string;
  desc: string;
  to: string;
  done: boolean;
};

interface Props {
  hasContacts: boolean;
  hasCards: boolean;
  hasInvoices: boolean;
  businessNameSet: boolean;
}

const DISMISS_KEY = 'onboarding_dismissed_v1';

export function OnboardingChecklist({ hasContacts, hasCards, hasInvoices, businessNameSet }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  const steps: Step[] = [
    {
      id: 'name',
      label: 'Name your workspace',
      desc: 'Set your business name in the sidebar.',
      to: '/settings',
      done: businessNameSet,
    },
    {
      id: 'contact',
      label: 'Add your first contact',
      desc: 'Keep every client and lead in one place.',
      to: '/contacts',
      done: hasContacts,
    },
    {
      id: 'card',
      label: 'Create a workflow card',
      desc: 'Track a deal or project through your pipeline.',
      to: '/workflow',
      done: hasCards,
    },
    {
      id: 'invoice',
      label: 'Generate your first invoice',
      desc: 'Bill a client with a branded PDF in seconds.',
      to: '/invoices',
      done: hasInvoices,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = completed === total;

  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <Card className="p-5 mb-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Get set up in 4 quick steps
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {completed} of {total} complete
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss onboarding"
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {steps.map((step) => (
            <Link
              key={step.id}
              to={step.to}
              className={`group flex items-start gap-3 p-3 rounded-lg border transition-all ${
                step.done
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-gray-200 dark:border-gray-800 hover:border-violet-500/40 hover:bg-violet-500/5'
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'text-gray-500 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
              </div>
              {!step.done && (
                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
