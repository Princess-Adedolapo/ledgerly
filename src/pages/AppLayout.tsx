import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useWorkspace } from '../lib/workspace';
import { useUserPreferences } from '../lib/userPreferences';
import { ThemeToggle } from '../components/ThemeToggle';
import { WorkspaceSwitcher } from '../components/workspace/WorkspaceSwitcher';
import { HelpTriggerButton } from '../components/help/HelpTriggerButton';
import { HelpReportModal } from '../components/help/HelpReportModal';
import { BarChart3, LayoutDashboard, Users, KanbanSquare, Settings, LogOut, Menu, FileText, Mail, ShieldCheck, HelpCircle } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3, end: true },
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
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  onOpenHelp,
}: {
  onNavigate?: () => void;
  onSignOut: () => void;
  user: { email?: string } | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onOpenHelp?: () => void;
}) {
  const { displayName } = useUserPreferences();
  const userInitial = (displayName ?? user?.email?.split('@')[0])?.[0]?.toUpperCase() ?? '?';
  const userName = displayName ?? user?.email?.split('@')[0] ?? 'User';

  return (
    <>
      {/* Logo + workspace switcher (CSS Selector 2 target) */}
      <div
        id="sidebar-header"
        className={`flex items-center h-16 border-b border-gray-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3.5'
        }`}
      >
        {/* Clickable logo container & SVG (CSS Selector 1 target) */}
        <div
          id="sidebar-logo-container"
          role="button"
          tabIndex={0}
          onClick={onToggleCollapse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleCollapse?.();
            }
          }}
          title={
            isMobile
              ? 'Close menu'
              : isCollapsed
              ? 'Expand sidebar (⌘B)'
              : 'Collapse sidebar to widen workspace (⌘B)'
          }
          aria-label={
            isMobile
              ? 'Close menu'
              : isCollapsed
              ? 'Expand sidebar to normal view'
              : 'Collapse sidebar to enlarge main page'
          }
          aria-expanded={!isCollapsed}
          className={`group relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 flex items-center justify-center shadow-md shadow-violet-600/25 hover:shadow-violet-600/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 select-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
            isCollapsed ? 'ring-2 ring-violet-500/40' : ''
          }`}
        >
          <LayoutDashboard
            id="sidebar-logo-svg"
            className="w-5 h-5 text-white transition-all duration-300 group-hover:scale-110 cursor-pointer shrink-0"
          />
        </div>

        {/* Workspace switcher (smoothly hidden when collapsed) */}
        {!isCollapsed && (
          <div className="flex-1 min-w-0 transition-opacity duration-200 opacity-100">
            <WorkspaceSwitcher />
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav
        className={`flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none ${
          isCollapsed ? 'px-2' : 'px-3'
        }`}
        onClick={onNavigate}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            className={({ isActive }) =>
              `relative group flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                isCollapsed
                  ? 'justify-center w-11 h-11 mx-auto'
                  : 'gap-3 px-3.5 py-2.5'
              } ${
                isActive
                  ? 'bg-violet-600/15 text-violet-600 dark:text-violet-400 font-semibold shadow-sm ' +
                    (isCollapsed ? 'ring-1 ring-violet-500/40' : 'border-l-2 border-violet-500')
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100/80 dark:hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
            {!isCollapsed && (
              <span className="truncate transition-opacity duration-200">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        className={`border-t border-gray-200/80 dark:border-slate-800/80 transition-all duration-200 overflow-x-hidden ${
          isCollapsed ? 'px-2 py-3' : 'px-3 py-4'
        }`}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            {/* User avatar with native tooltip */}
            <div
              className="relative group w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-bold text-white shadow-sm cursor-pointer"
              title={`${userName} (${user?.email ?? ''})`}
            >
              {userInitial}
            </div>

            {/* Quick action icons */}
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <ThemeToggle />
              <button
                type="button"
                onClick={onOpenHelp}
                title="Need help or found a bug?"
                aria-label="Need help or found a bug?"
                className="relative group p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <NavLink
                to="/terms"
                title="Terms of Use"
                className="relative group p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
              >
                <FileText className="w-4 h-4" />
              </NavLink>
              <NavLink
                to="/privacy"
                title="Privacy Policy"
                className="relative group p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
              </NavLink>
              <button
                onClick={onSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="relative group p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-medium text-white shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{userName}</p>
                <p className="text-xs text-gray-400 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-3">
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenHelp}
                  title="Need help or found a bug?"
                  aria-label="Need help or found a bug?"
                  className="p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <NavLink
                  to="/terms"
                  title="Terms of Use"
                  className="p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                  <FileText className="w-4 h-4" />
                </NavLink>
                <NavLink
                  to="/privacy"
                  title="Privacy Policy"
                  className="p-2 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                </NavLink>
                <ThemeToggle />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { businessName } = useWorkspace();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Persistent sidebar collapse state with sensible defaults for screen width
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('app_sidebar_collapsed');
      if (stored !== null) return stored === 'true';
      // On tablet or compact screens (<1024px), collapse by default to maximize content width
      return typeof window !== 'undefined' && window.innerWidth < 1024;
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('app_sidebar_collapsed', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Keyboard shortcut: Cmd+B (Mac) or Ctrl+B (Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF] dark:bg-[#0B0F19] flex transition-colors duration-200">
      {/* Desktop & tablet sidebar (CSS Selector 1 & 2 parent) */}
      <aside
        id="app-sidebar"
        className={`hidden md:flex flex-col bg-white/95 dark:bg-[#111625] backdrop-blur-xl border-r border-purple-100/60 dark:border-slate-800 shrink-0 transition-[width] duration-300 ease-in-out select-none overflow-hidden ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          onSignOut={handleSignOut}
          user={user}
          onOpenHelp={() => setHelpModalOpen(true)}
        />
      </aside>

      {/* Mobile top navigation header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 dark:bg-[#111625]/90 backdrop-blur-xl border-b border-purple-100/60 dark:border-slate-800 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
          aria-label="Open menu and navigation"
          title="Open menu"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-sm group-hover:scale-105 active:scale-95 transition-transform">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-slate-100 truncate max-w-[180px]">
            {businessName}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-[#151C2C] border-r border-gray-200 dark:border-slate-800 flex flex-col shadow-2xl">
            <SidebarContent
              isMobile
              onNavigate={() => setMobileOpen(false)}
              onToggleCollapse={() => setMobileOpen(false)}
              onSignOut={handleSignOut}
              user={user}
              onOpenHelp={() => {
                setMobileOpen(false);
                setHelpModalOpen(true);
              }}
            />
          </aside>
        </div>
      )}

      {/* Main content - seamlessly expands wider when sidebar closes */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0 transition-all duration-300 ease-in-out">
        <Outlet />
      </main>

      {/* Subtle Floating Action Button (FAB) in bottom-right corner visible across all dashboard views */}
      <HelpTriggerButton onClick={() => setHelpModalOpen(true)} />

      {/* Help & Report Problem Modal */}
      <HelpReportModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
    </div>
  );
}
