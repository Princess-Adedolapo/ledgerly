import React from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTriggerButtonProps {
  onClick: () => void;
  className?: string;
}

export function HelpTriggerButton({ onClick, className = '' }: HelpTriggerButtonProps) {
  return (
    <div
      id="dashboard-help-fab-container"
      className={`fixed bottom-5 right-5 z-40 select-none ${className}`}
      style={{
        bottom: 'max(1.25rem, calc(1.25rem + env(safe-area-inset-bottom, 0px)))',
        right: 'max(1.25rem, calc(1.25rem + env(safe-area-inset-right, 0px)))',
      }}
    >
      <button
        id="dashboard-help-fab-btn"
        type="button"
        onClick={onClick}
        aria-label="Need help or found a bug? Open support report"
        title="Need help or found a bug?"
        className="group relative flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full bg-white/95 dark:bg-[#151C2C]/95 backdrop-blur-md border border-purple-200/80 dark:border-slate-800 text-gray-700 dark:text-slate-200 shadow-lg shadow-violet-500/10 hover:shadow-xl hover:shadow-violet-500/20 hover:border-violet-400 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
      >
        <div className="w-5 h-5 rounded-full bg-violet-600/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
          <HelpCircle className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold tracking-wide">
          Help
        </span>
      </button>
    </div>
  );
}
