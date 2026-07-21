import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (from .env files) and merge with process.env so that
  // the connected Supabase integration's variables are available regardless
  // of whether they use the VITE_, NEXT_PUBLIC_, or bare prefix.
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const env = { ...fileEnv, ...process.env };

  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    '';

  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    '';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabasePublishableKey),
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true,
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
