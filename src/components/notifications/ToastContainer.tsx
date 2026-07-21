import { X, UserPlus, FileText, KanbanSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast, type ToastType } from '../../contexts/ToastContext';

const toastConfig: Record<ToastType, { icon: typeof UserPlus; bg: string; text: string; iconColor: string }> = {
  contact: { icon: UserPlus, bg: 'bg-sky-500/10 border-sky-500/20', text: 'text-gray-900 dark:text-gray-100', iconColor: 'text-sky-500' },
  invoice: { icon: FileText, bg: 'bg-violet-500/10 border-violet-500/20', text: 'text-gray-900 dark:text-gray-100', iconColor: 'text-violet-500' },
  workflow: { icon: KanbanSquare, bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-gray-900 dark:text-gray-100', iconColor: 'text-amber-500' },
  success: { icon: CheckCircle, bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-gray-900 dark:text-gray-100', iconColor: 'text-emerald-500' },
  error: { icon: AlertCircle, bg: 'bg-red-500/10 border-red-500/20', text: 'text-gray-900 dark:text-gray-100', iconColor: 'text-red-500' },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-lg ${config.bg} pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-300`}
          >
            <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${config.text}`}>{toast.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss toast"
              className="shrink-0 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
