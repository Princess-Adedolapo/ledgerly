import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useWorkspace } from '../lib/workspace';
import { useUserPreferences } from '../lib/userPreferences';
import { ThemeToggle } from '../components/ThemeToggle';
import { WorkspaceSwitcher } from '../components/workspace/WorkspaceSwitcher';
import { LayoutDashboard, Users, KanbanSquare, Settings, LogOut, Menu, X, FileText, Mail, ShieldCheck } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/contacts', label: 'Contacts', icon: Users, end: false },
  { to: '/invoices', label: 'Invoices', icon: FileText, end: false },
  { to: '/workflow', label: 'Workflow Board', icon: KanbanSquare, end: false },
  { to: '/email', label: 'Email Composer', icon: Mail, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];


function SidebarContent({
  onNavigate,
  onSignOut,
  user,
}: {
  onNavigate?: () => void;
  onSignOut: () => void;
  user: { email?: string } | null;
}) {
  const { displayName } = useUserPreferences();

  return (
    <>
      {/* Logo + workspace switcher */}
      <div className="flex items-center gap-2 px-3 h-16 border-b border-gray-200 dark:border-gray-800">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/20 shrink-0">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" onClick={onNavigate}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-violet-600/20 text-violet-600 dark:text-violet-400 border-l-2 border-violet-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-sm font-medium text-white shrink-0">
            {(displayName ?? user?.email?.split('@')[0])?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{displayName ?? user?.email?.split('@')[0] ?? 'User'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-3">
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
          <div className="flex items-center gap-1">
            <NavLink
              to="/privacy"
              title="Privacy Policy"
              className="p-2 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
            </NavLink>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { businessName } = useWorkspace();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF] dark:bg-[#0F0E17] flex transition-colors duration-200">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white/95 dark:bg-gray-900/40 backdrop-blur-xl border-r border-purple-100/60 dark:border-gray-800 shrink-0">
        <SidebarContent onSignOut={handleSignOut} user={user} />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 dark:bg-gray-900/80 backdrop-blur-xl border-b border-purple-100/60 dark:border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">{businessName}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-5 h-16 border-b border-gray-200 dark:border-gray-800">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Menu</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} onSignOut={handleSignOut} user={user} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
