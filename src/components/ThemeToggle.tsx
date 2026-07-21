import { useTheme } from '../lib/userPreferences';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`relative rounded-lg p-2 transition-all duration-300 hover:bg-accent-soft ${className}`}
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
