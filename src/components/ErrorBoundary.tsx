import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <section className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-300">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-gray-950 dark:text-gray-50">Something needs a refresh</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
            The app hit a temporary loading issue. Refreshing usually restores the workspace right away.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh app
          </button>
        </section>
      </main>
    );
  }
}