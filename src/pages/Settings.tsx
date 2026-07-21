import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useWorkspace } from '../lib/workspace';
import { useUserPreferences, useTheme } from '../lib/userPreferences';
import { CURRENCY_CONFIG, CURRENCY_CODES, formatCurrency } from '../lib/currency';
import type { CurrencyCode, CurrencyDisplayMode, HistoricalCurrencyMode } from '../lib/supabase';
import { PageHeader, Card, Button, Toast } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { useNotificationPreferences, type NotificationPreferences } from '../contexts/NotificationContext';
import { LogOut, User, Shield, Bell, Building2, Palette, Check, Globe, Type, Trash2, AlertTriangle, X, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TeamTab } from '../components/workspace/TeamTab';
import { DeleteWorkspaceSection } from '../components/settings/DeleteWorkspaceSection';

const DISPLAY_NAME_REGEX = /^[a-zA-Z0-9 -]+$/;

export default function Settings() {
  const { user, signOut } = useAuth();
  const {
    businessName,
    setBusinessName,
    businessTagline,
    setBusinessTagline,
    activeWorkspaceId,
    loading: workspaceLoading,
    workspaces,
    softDeleteWorkspace,
  } = useWorkspace();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const isOwner = !!activeWorkspace && !!user && activeWorkspace.owner_id === user.id;
  const workspaceReady = !workspaceLoading && !!activeWorkspaceId;
  const { theme, setTheme } = useTheme();
  const {
    displayName,
    currencyCode,
    currencyDisplayMode,
    historicalCurrencyMode,
    updatePreferences,
  } = useUserPreferences();
  const navigate = useNavigate();
  const [nameInput, setNameInput] = useState(businessName);
  const [savingName, setSavingName] = useState(false);
  const [taglineInput, setTaglineInput] = useState(businessTagline);
  const [savingTagline, setSavingTagline] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Display name form state
  const [displayNameInput, setDisplayNameInput] = useState(displayName ?? '');
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  // Delete account state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Delete workspace state
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false);
  const [deleteWorkspaceConfirm, setDeleteWorkspaceConfirm] = useState('');
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);
  const [deleteWorkspaceError, setDeleteWorkspaceError] = useState<string | null>(null);

  const handleDeleteWorkspace = async () => {
    setDeleteWorkspaceError(null);
    if (deleteWorkspaceConfirm !== businessName) {
      setDeleteWorkspaceError(`Please type "${businessName}" to confirm`);
      return;
    }
    if (!activeWorkspaceId) return;

    setDeletingWorkspace(true);
    try {
      await softDeleteWorkspace(activeWorkspaceId);
      showToast('Workspace deleted successfully');
      setDeleteWorkspaceOpen(false);
      setDeleteWorkspaceConfirm('');
    } catch (err) {
      setDeleteWorkspaceError(err instanceof Error ? err.message : 'Failed to delete workspace');
    } finally {
      setDeletingWorkspace(false);
    }
  };

  const closeDeleteWorkspaceModal = () => {
    if (deletingWorkspace) return;
    setDeleteWorkspaceOpen(false);
    setDeleteWorkspaceConfirm('');
    setDeleteWorkspaceError(null);
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    if (deleteConfirm !== 'DELETE') {
      setDeleteError('Type DELETE to confirm');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: { confirm: deleteConfirm, password: deletePassword },
    });
    if (error || (data && (data as { error?: string }).error)) {
      setDeleting(false);
      setDeleteError((data as { error?: string })?.error ?? error?.message ?? 'Failed to delete account');
      return;
    }
    await supabase.auth.signOut();
    navigate('/auth');
  };

  useEffect(() => {
    setNameInput(businessName);
  }, [businessName]);

  useEffect(() => {
    setTaglineInput(businessTagline);
  }, [businessTagline]);


  useEffect(() => {
    setDisplayNameInput(displayName ?? '');
  }, [displayName]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message: string, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 3000);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      await setBusinessName(trimmed);
      showToast('Business name saved successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save name', true);
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveTagline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTagline(true);
    try {
      await setBusinessTagline(taglineInput.trim());
      showToast('Tagline saved successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save tagline', true);
    } finally {
      setSavingTagline(false);
    }
  };

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayNameInput.trim();
    if (trimmed && !DISPLAY_NAME_REGEX.test(trimmed)) {
      setDisplayNameError('Only alphanumeric characters, spaces, and hyphens are allowed');
      return;
    }
    if (trimmed.length > 50) {
      setDisplayNameError('Display name must be 50 characters or fewer');
      return;
    }
    setDisplayNameError(null);
    setSavingDisplayName(true);
    const { error } = await updatePreferences({ display_name: trimmed || null });
    setSavingDisplayName(false);
    if (error) {
      showToast('Failed to save display name', true);
    } else {
      showToast('Display name saved successfully');
    }
  };

  const handleCurrencyChange = async (code: CurrencyCode) => {
    const { error } = await updatePreferences({ currency_code: code });
    if (error) showToast('Failed to update currency', true);
  };

  const handleDisplayModeChange = async (mode: CurrencyDisplayMode) => {
    const { error } = await updatePreferences({ currency_display_mode: mode });
    if (error) showToast('Failed to update display mode', true);
  };

  const handleHistoricalModeChange = async (mode: HistoricalCurrencyMode) => {
    const { error } = await updatePreferences({ historical_currency_mode: mode });
    if (error) showToast('Failed to update historical currency mode', true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const [tab, setTab] = useState<'general' | 'team'>('general');

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your account and workspace preferences" />

      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setTab('general')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'general' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
        >
          General
        </button>
        <button
          onClick={() => setTab('team')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-2 ${tab === 'team' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
        >
          <Users className="w-4 h-4" /> Team
        </button>
      </div>

      {tab === 'team' ? (
        <TeamTab />
      ) : (
      <div className="space-y-6">
        {/* Branding */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-violet-600/10 dark:bg-violet-600/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Branding</h2>
          </div>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Business Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="CatalystAI Hub"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                This name appears in the sidebar, browser tab, and dashboard heading.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={savingName || !workspaceReady || nameInput.trim() === businessName}>
                  <span className="flex items-center gap-2">
                    {savingName ? 'Saving...' : <><Check className="w-4 h-4" /> Save</>}
                  </span>
                </Button>
                {!workspaceReady && (
                  <span className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <span className="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-violet-500 animate-spin" />
                    Loading workspace…
                  </span>
                )}
              </div>

              {workspaceReady && isOwner && (
                <button
                  type="button"
                  onClick={() => setDeleteWorkspaceOpen(true)}
                  className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium flex items-center gap-1.5 transition-colors focus:outline-none"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Workspace
                </button>
              )}
            </div>
          </form>

          <form onSubmit={handleSaveTagline} className="space-y-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800/50">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Business Tagline</label>
              <input
                type="text"
                value={taglineInput}
                onChange={(e) => setTaglineInput(e.target.value)}
                placeholder="Professional Services"
                maxLength={80}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                Shown under your business name on invoices. Leave blank to hide it.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={savingTagline || !workspaceReady || taglineInput.trim() === businessTagline.trim()}>
                <span className="flex items-center gap-2">
                  {savingTagline ? 'Saving...' : <><Check className="w-4 h-4" /> Save Tagline</>}
                </span>
              </Button>
              {!workspaceReady && (
                <span className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span className="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-violet-500 animate-spin" />
                  Loading workspace…
                </span>
              )}
            </div>
          </form>
        </Card>

        {/* Localization */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Localization</h2>
          </div>

          <div className="space-y-5">
            {/* Default Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Default Currency</label>
              <select
                value={currencyCode}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
              >
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>{CURRENCY_CONFIG[code].label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                Preview: {formatCurrency(1200, currencyCode, currencyDisplayMode)}
              </p>
            </div>

            {/* Currency Display Mode */}
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency Display Mode</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDisplayModeChange('symbol')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    currencyDisplayMode === 'symbol'
                      ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 border-violet-500/30'
                      : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Symbol only ({formatCurrency(1200, currencyCode, 'symbol')})
                </button>
                <button
                  onClick={() => handleDisplayModeChange('code')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    currencyDisplayMode === 'code'
                      ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 border-violet-500/30'
                      : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Currency code ({formatCurrency(1200, currencyCode, 'code')})
                </button>
              </div>
            </div>

            {/* Historical Data Currency Toggle */}
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Historical Data Currency</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleHistoricalModeChange('original')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    historicalCurrencyMode === 'original'
                      ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 border-violet-500/30'
                      : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Original currency
                </button>
                <button
                  onClick={() => handleHistoricalModeChange('converted')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    historicalCurrencyMode === 'converted'
                      ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 border-violet-500/30'
                      : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Convert to current currency
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                {historicalCurrencyMode === 'original'
                  ? 'Historical sales figures show the currency recorded at the time.'
                  : 'Historical sales figures are reformatted using your current currency.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
              <Palette className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Currently using {theme === 'dark' ? 'Dark' : 'Light'} mode. Toggle to switch.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{theme}</span>
              <ThemeToggle />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                theme === 'dark'
                  ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 border-violet-500/30'
                  : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                theme === 'light'
                  ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400 border-violet-500/30'
                  : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Light
            </button>
          </div>
        </Card>

        {/* Profile */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile</h2>
          </div>

          <form onSubmit={handleSaveDisplayName} className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Display Name</label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => {
                    setDisplayNameInput(e.target.value);
                    if (e.target.value && !DISPLAY_NAME_REGEX.test(e.target.value)) {
                      setDisplayNameError('Only alphanumeric characters, spaces, and hyphens are allowed');
                    } else if (e.target.value.length > 50) {
                      setDisplayNameError('Display name must be 50 characters or fewer');
                    } else {
                      setDisplayNameError(null);
                    }
                  }}
                  maxLength={50}
                  placeholder={user?.email?.split('@')[0] ?? 'Your name'}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
              </div>
              {displayNameError ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1.5">{displayNameError}</p>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  Alphanumeric characters, spaces, and hyphens. Max 50 characters. Falls back to email prefix if empty.
                </p>
              )}
            </div>
            <Button type="submit" disabled={savingDisplayName || displayNameInput.trim() === (displayName ?? '')}>
              <span className="flex items-center gap-2">
                {savingDisplayName ? 'Saving...' : <><Check className="w-4 h-4" /> Save Display Name</>}
              </span>
            </Button>
          </form>

          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
              <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
              <span className="text-sm text-gray-500 dark:text-gray-400">User ID</span>
              <span className="text-sm text-gray-400 dark:text-gray-500 font-mono">{user?.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">Team Member</span>
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Security</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/50">
              <span className="text-sm text-gray-500 dark:text-gray-400">Authentication</span>
              <span className="text-sm text-emerald-600 dark:text-emerald-400">Email & Password</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Session</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">Active</span>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
          </div>
          <div className="space-y-4">
            <NotificationToggle
              label="New Contact Registration Alerts"
              description="Notify when a new contact is added"
              prefKey="contactAlerts"
            />
            <NotificationToggle
              label="Invoice Generated & Due Reminders"
              description="Notify when an invoice is created or becomes overdue"
              prefKey="invoiceAlerts"
            />
            <NotificationToggle
              label="Workflow Card Status Changes"
              description="Notify when a card is moved between columns"
              prefKey="workflowAlerts"
            />
          </div>
        </Card>

        {/* Sign Out */}
        <Card className="p-6 border-red-500/20">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Sign Out</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Sign out of your account. You'll need to sign in again to access your workspace.
          </p>
          <Button variant="danger" onClick={handleSignOut}>
            <span className="flex items-center gap-2"><LogOut className="w-4 h-4" /> Sign Out</span>
          </Button>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete Account</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Permanently delete your account and all associated data (contacts, invoices, workflow, workspace). This cannot be undone. You can sign up again later with the same email.
              </p>
            </div>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Account</span>
            </Button>
          </div>
        </Card>

        <DeleteWorkspaceSection />
      </div>
      )}



      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !deleting && setDeleteOpen(false)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-red-500/30 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete account?</h3>
              </div>
              <button onClick={() => !deleting && setDeleteOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This permanently deletes your account, contacts, invoices, workflow cards, and workspace. This cannot be undone.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm</label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm your password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                />
              </div>
              {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== 'DELETE' || !deletePassword}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteWorkspaceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeDeleteWorkspaceModal}>
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-red-500/30 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete workspace?</h3>
              </div>
              <button onClick={closeDeleteWorkspaceModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Delete <strong>{businessName}</strong>? This action cannot be undone. All contacts, invoices, and workflow cards under this workspace will be deleted.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Type <span className="font-mono font-bold text-red-500">{businessName}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteWorkspaceConfirm}
                  onChange={(e) => setDeleteWorkspaceConfirm(e.target.value)}
                  placeholder={businessName}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                />
              </div>
              {deleteWorkspaceError && <p className="text-sm text-red-500">{deleteWorkspaceError}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={closeDeleteWorkspaceModal}
                disabled={deletingWorkspace}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWorkspace}
                disabled={deletingWorkspace || deleteWorkspaceConfirm !== businessName}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingWorkspace ? 'Deleting…' : 'Delete Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMessage} show={toast} isError={toastError} />
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  prefKey,
}: {
  label: string;
  description: string;
  prefKey: keyof NotificationPreferences;
}) {
  const { preferences, updatePreference } = useNotificationPreferences();
  const enabled = preferences[prefKey];

  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => updatePreference(prefKey, !enabled)}
        aria-label={label}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-700'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}
