import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce a value over a given delay period.
 * Useful for minimizing unnecessary high-frequency recalculations, API calls, or filter re-renders.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
