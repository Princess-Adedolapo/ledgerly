import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { WorkspaceProvider } from './lib/workspace';
import { UserPreferencesProvider } from './lib/userPreferences';
import { ToastProvider } from './contexts/ToastContext';
import { ActivityLogProvider } from './contexts/ActivityLogContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastContainer } from './components/notifications/ToastContainer';
import AuthPage from './pages/AuthPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import AppLayout from './pages/AppLayout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import WorkflowBoard from './pages/WorkflowBoard';
import Settings from './pages/Settings';
import Invoices from './pages/Invoices';
import EmailComposer from './components/email/EmailComposer';
import AcceptInvitePage from './pages/AcceptInvitePage';
import ClientPortalPage from './pages/ClientPortalPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import { LayoutDashboard } from 'lucide-react';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center animate-pulse">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="/portal/invoice/:id" element={<ClientPortalPage />} />
      <Route path="/portal/share/:id" element={<ClientPortalPage />} />
      <Route path="/portal/proposal/:id" element={<ClientPortalPage />} />
      <Route path="/portal/quote/:id" element={<ClientPortalPage />} />
      <Route path="/portal/:docType/:id" element={<ClientPortalPage />} />
      <Route path="/portal/:id" element={<ClientPortalPage />} />
      <Route path="/portal" element={<ClientPortalPage />} />
      <Route path="/share/invoice/:id" element={<ClientPortalPage />} />
      <Route path="/share/proposal/:id" element={<ClientPortalPage />} />
      <Route path="/share/quote/:id" element={<ClientPortalPage />} />
      <Route path="/share/:docType/:id" element={<ClientPortalPage />} />
      <Route path="/share/:id" element={<ClientPortalPage />} />
      <Route path="/share" element={<ClientPortalPage />} />
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        }
      />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      <Route path="/reset-password" element={<UpdatePasswordPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/:id" element={<ContactDetail />} />
        <Route path="/workflow" element={<WorkflowBoard />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/*" element={<Navigate to="/invoices" replace />} />
        <Route path="/email" element={<EmailComposer />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


export default function App() {
  return (
    <UserPreferencesProvider>
      <WorkspaceProvider>
        <ToastProvider>
          <ActivityLogProvider>
            <NotificationProvider>
              <BrowserRouter>
                <AppRoutes />
                <ToastContainer />
              </BrowserRouter>
            </NotificationProvider>
          </ActivityLogProvider>
        </ToastProvider>
      </WorkspaceProvider>
    </UserPreferencesProvider>
  );
}
