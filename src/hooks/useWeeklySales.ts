import { useEffect, useState, useCallback, useRef } from 'react';
import { getWeeklySalesActual, subscribeToInvoices } from '../services/invoiceService';
import { supabase } from '../lib/supabase';
import { useUserPreferences } from '../lib/userPreferences';

export function useWeeklySales() {
  const [actual, setActual] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const { currencyCode } = useUserPreferences();

  const refresh = useCallback(async () => {
    try {
      const value = await getWeeklySalesActual(currencyCode);
      if (mountedRef.current) {
        setActual(value);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        // TODO: connect to real invoices table — fallback to mock value
        setActual(15000);
        setLoading(false);
      }
    }
  }, [currencyCode]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    const interval = setInterval(refresh, 60000);

    const channel = subscribeToInvoices(() => {
      refresh();
    });

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { actual, loading, refresh };
}
