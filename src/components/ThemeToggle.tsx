import { useTheme } from '../lib/userPreferences';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'Soft Lavender Light' : 'Dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'Soft Lavender Light' : 'Dark'} mode`}
      className={`relative rounded-xl p-2 transition-all duration-300 hover:bg-violet-500/10 text-slate-700 dark:text-slate-300 border border-purple-100/60 dark:border-purple-900/40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xs flex items-center justify-center ${className}`}
    >
      <div className="relative w-5 h-5">
        <Sun
          className={`absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-300 ${
            theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'
          }`}
        />
        <Moon
          className={`absolute inset-0 w-5 h-5 text-violet-400 transition-all duration-300 ${
            theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
          }`}
        />
      </div>
    </button>
  );
}
