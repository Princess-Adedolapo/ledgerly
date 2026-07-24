import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown, User, Building, Mail, Phone } from 'lucide-react';
import { type Contact } from '../../lib/supabase';

interface SearchableContactSelectProps {
  contacts: Contact[];
  value: string; // Contact ID or Name depending on valueType
  onChange: (value: string, contact?: Contact) => void;
  placeholder?: string;
  label?: string;
  valueType?: 'id' | 'name';
  disabled?: boolean;
  className?: string;
}

function getAvatarInitial(name: string | null | undefined): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: 'bg-violet-500/15 dark:bg-violet-500/25', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-indigo-500/15 dark:bg-indigo-500/25', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-emerald-500/15 dark:bg-emerald-500/25', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-sky-500/15 dark:bg-sky-500/25', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-amber-500/15 dark:bg-amber-500/25', text: 'text-amber-700 dark:text-amber-300' },
];

function getAvatarColor(name: string | null | undefined) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function SearchableContactSelect({
  contacts,
  value,
  onChange,
  placeholder = 'Select a customer...',
  label,
  valueType = 'id',
  disabled = false,
  className = '',
}: SearchableContactSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find selected contact object
  const selectedContact = useMemo(() => {
    if (!value) return null;
    if (valueType === 'id') {
      return contacts.find((c) => c.id === value) || null;
    } else {
      return contacts.find((c) => c.name.toLowerCase().trim() === value.toLowerCase().trim()) || null;
    }
  }, [contacts, value, valueType]);

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase().trim();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [contacts, searchQuery]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (contact: Contact) => {
    const selectedVal = valueType === 'id' ? contact.id : contact.name;
    onChange(selectedVal, contact);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className} ${isOpen ? 'z-[60]' : 'z-10'}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Main Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border rounded-lg text-sm transition-all cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-violet-500/70'
        } ${
          isOpen
            ? 'border-violet-500 ring-2 ring-violet-500/20 bg-white dark:bg-gray-800 shadow-sm'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          {selectedContact ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  getAvatarColor(selectedContact.name).bg
                } ${getAvatarColor(selectedContact.name).text}`}
              >
                {getAvatarInitial(selectedContact.name)}
              </span>
              <span className="font-medium text-gray-900 dark:text-white truncate">
                {selectedContact.name}
              </span>
              {selectedContact.company && (
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate hidden sm:inline">
                  • {selectedContact.company}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedContact && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/60 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-violet-500' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Overlay / Popover */}
      {isOpen && (
        <div className="absolute z-[70] left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/80">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-violet-500 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type name, email, company or phone..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-1 mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              <span>
                {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
              </span>
              {searchQuery && (
                <span>Filtering by &ldquo;{searchQuery}&rdquo;</span>
              )}
            </div>
          </div>

          {/* Contacts List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-gray-50 dark:divide-gray-800/40">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center">
                <User className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  No contacts found
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  Try searching for another name or email
                </p>
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isSelected =
                  valueType === 'id'
                    ? c.id === value
                    : c.name.toLowerCase().trim() === value.toLowerCase().trim();

                const avatarStyle = getAvatarColor(c.name);

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-100 font-medium'
                        : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarStyle.bg} ${avatarStyle.text}`}
                      >
                        {getAvatarInitial(c.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {c.name}
                          </span>
                          {c.company && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md truncate max-w-[110px]">
                              <Building className="w-2.5 h-2.5 shrink-0" />
                              {c.company}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                          {c.email && (
                            <span className="truncate inline-flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5 text-gray-400" />
                              {c.email}
                            </span>
                          )}
                          {c.email && c.phone && <span>•</span>}
                          {c.phone && (
                            <span className="truncate inline-flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-gray-400" />
                              {c.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
