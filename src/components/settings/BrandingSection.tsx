import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Trash2,
  Check,
  Building2,
  Palette,
  Sparkles,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Card, Button } from '../ui';
import {
  BRAND_COLOR_PRESETS,
  DEFAULT_BRAND_COLOR,
  getBrandSettings,
  saveBrandSettings,
  processLogoImageFile,
  getContrastTextColor,
} from '../../lib/branding';

interface BrandingSectionProps {
  businessName: string;
  setBusinessName: (name: string) => Promise<void>;
  businessTagline: string;
  setBusinessTagline: (tagline: string) => Promise<void>;
  workspaceReady: boolean;
  isOwner: boolean;
  onDeleteWorkspace: () => void;
  showToast: (message: string, isError?: boolean) => void;
}

export function BrandingSection({
  businessName,
  setBusinessName,
  businessTagline,
  setBusinessTagline,
  workspaceReady,
  isOwner,
  onDeleteWorkspace,
  showToast,
}: BrandingSectionProps) {
  // Business Name and Tagline form state
  const [nameInput, setNameInput] = useState(businessName);
  const [savingName, setSavingName] = useState(false);
  const [taglineInput, setTaglineInput] = useState(businessTagline);
  const [savingTagline, setSavingTagline] = useState(false);

  // Logo and Brand Color state
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [brandColor, setBrandColor] = useState<string>(DEFAULT_BRAND_COLOR);
  const [customHex, setCustomHex] = useState<string>(DEFAULT_BRAND_COLOR);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activePreviewDoc, setActivePreviewDoc] = useState<'invoice' | 'proposal' | 'quote'>('invoice');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameInput(businessName);
  }, [businessName]);

  useEffect(() => {
    setTaglineInput(businessTagline);
  }, [businessTagline]);

  // Load existing brand settings on mount
  useEffect(() => {
    const current = getBrandSettings();
    setLogoUrl(current.logoUrl);
    setBrandColor(current.brandColor || DEFAULT_BRAND_COLOR);
    setCustomHex(current.brandColor || DEFAULT_BRAND_COLOR);
  }, []);

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
      showToast('Business tagline saved successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save tagline', true);
    } finally {
      setSavingTagline(false);
    }
  };

  const handleFileProcess = async (file: File) => {
    setUploadingLogo(true);
    try {
      const optimizedDataUrl = await processLogoImageFile(file);
      setLogoUrl(optimizedDataUrl);
      // Auto-save brand settings immediately for instant gratification
      saveBrandSettings({ logoUrl: optimizedDataUrl, brandColor });
      showToast('Business logo uploaded and saved!');
    } catch (err) {
      console.error('Logo upload error:', err);
      showToast(err instanceof Error ? err.message : 'Failed to process logo image', true);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
    // reset input so user can re-select same file if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    saveBrandSettings({ logoUrl: '', brandColor });
    showToast('Business logo removed');
  };

  const handleSelectColorPreset = (hex: string) => {
    setBrandColor(hex);
    setCustomHex(hex);
    saveBrandSettings({ logoUrl, brandColor: hex });
    showToast(`Brand color updated to ${hex}`);
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setBrandColor(val);
      saveBrandSettings({ logoUrl, brandColor: val });
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    setBrandColor(val);
    saveBrandSettings({ logoUrl, brandColor: val });
  };

  const handleSaveAllBranding = () => {
    setSavingBranding(true);
    try {
      saveBrandSettings({ logoUrl, brandColor });
      showToast('Brand settings saved! Portal documents now reflect your custom logo and color.');
    } finally {
      setSavingBranding(false);
    }
  };

  const brandTextColor = getContrastTextColor(brandColor);

  return (
    <Card className="p-6 sm:p-8 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Branding & Client Portal Styling
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Customize your business logo, brand color, and document presentation on invoices, proposals, and quotes.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAllBranding}
          disabled={savingBranding}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <Check className="w-4 h-4" />
          Save Brand Styling
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Logo Upload & Brand Color Form */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. Business Logo Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-white">
                  Business Logo
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Featured on client portal documents and exported PDFs (PNG, JPG, SVG, WebP, max 5MB).
                </p>
              </div>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            {/* Logo Display or Drag-and-Drop Dropzone */}
            {logoUrl ? (
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Swatch preview */}
                  <div className="w-24 h-16 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2 flex items-center justify-center shadow-xs overflow-hidden">
                    <img
                      src={logoUrl}
                      alt="Business Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-1">
                      <Check className="w-3 h-3" /> Active Logo
                    </span>
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                      Ready for high-res portal display & PDF prints
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-violet-500" />
                    Change Logo
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 bg-gray-50/50 dark:bg-gray-800/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center mb-3">
                  {uploadingLogo ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {uploadingLogo ? 'Processing image...' : 'Click or drag & drop business logo'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Supports transparent PNG, JPG, WebP, or SVG (Max 5MB)
                </p>
              </div>
            )}
          </div>

          {/* 2. Brand Color Selection */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-white">
                  Document Brand Accent Color
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Styles top document bars, billing accent borders, document numbers, and totals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectColorPreset(DEFAULT_BRAND_COLOR)}
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 font-medium transition-colors"
              >
                Reset Default
              </button>
            </div>

            {/* Curated Preset Swatches */}
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2.5">
              {BRAND_COLOR_PRESETS.map((preset) => {
                const isSelected = brandColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    title={preset.name}
                    onClick={() => handleSelectColorPreset(preset.hex)}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/50 dark:bg-violet-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/60'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg shadow-xs flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                    </div>
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1.5 truncate max-w-full">
                      {preset.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Hex Color Picker Input */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-400 font-mono">HEX</span>
                <input
                  type="text"
                  value={customHex}
                  onChange={handleCustomHexChange}
                  placeholder="#1E293B"
                  maxLength={7}
                  className="w-24 bg-transparent text-sm font-mono font-bold text-gray-900 dark:text-white uppercase focus:outline-none"
                />
                <label className="relative cursor-pointer">
                  <input
                    type="color"
                    value={brandColor.startsWith('#') && brandColor.length === 7 ? brandColor : DEFAULT_BRAND_COLOR}
                    onChange={handleColorPickerChange}
                    className="sr-only"
                  />
                  <div
                    className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 shadow-xs cursor-pointer flex items-center justify-center transition-transform hover:scale-105"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Palette className="w-4 h-4 text-white drop-shadow-xs opacity-75" />
                  </div>
                </label>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                Current:{' '}
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {brandColor.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Business Name & Tagline Form */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <form onSubmit={handleSaveName} className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="CatalystAI Hub"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <Button
                  type="submit"
                  disabled={savingName || !workspaceReady || nameInput.trim() === businessName}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    {savingName ? 'Saving...' : <><Check className="w-3.5 h-3.5" /> Save Name</>}
                  </span>
                </Button>
                {workspaceReady && isOwner && (
                  <button
                    type="button"
                    onClick={onDeleteWorkspace}
                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Workspace
                  </button>
                )}
              </div>
            </form>

            <form onSubmit={handleSaveTagline} className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800/50">
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">
                  Business Tagline
                </label>
                <input
                  type="text"
                  value={taglineInput}
                  onChange={(e) => setTaglineInput(e.target.value)}
                  placeholder="Professional Enterprise Services"
                  maxLength={80}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={savingTagline || !workspaceReady || taglineInput.trim() === businessTagline.trim()}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {savingTagline ? 'Saving...' : <><Check className="w-3.5 h-3.5" /> Save Tagline</>}
                </span>
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Document Portal Preview */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Live Document Preview
              </span>
            </div>

            {/* Document Type Selector */}
            <div className="flex items-center p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActivePreviewDoc('invoice')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  activePreviewDoc === 'invoice'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                Invoice
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewDoc('proposal')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  activePreviewDoc === 'proposal'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                Proposal
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewDoc('quote')}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  activePreviewDoc === 'quote'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                Quote
              </button>
            </div>
          </div>

          {/* Interactive Document Sheet Mockup */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white shadow-md overflow-hidden text-slate-900">
            {/* Top Brand Accent Bar */}
            <div
              className="h-3 w-full transition-colors duration-200"
              style={{ backgroundColor: brandColor }}
            />

            <div className="p-5 space-y-5">
              {/* Header: Logo + Doc Type */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <div className="p-1 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center max-h-12 max-w-[120px]">
                        <img
                          src={logoUrl}
                          alt="Logo Preview"
                          className="max-h-10 max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs shrink-0"
                        style={{ backgroundColor: brandColor, color: brandTextColor }}
                      >
                        {(nameInput || 'B')[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">
                        {nameInput || 'Your Business Name'}
                      </p>
                      {taglineInput && (
                        <p className="text-[10px] text-slate-500 font-medium">
                          {taglineInput}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                    {activePreviewDoc.toUpperCase()}
                  </span>
                  <p
                    className="text-xs font-mono font-bold mt-0.5 px-2 py-0.5 rounded border inline-block"
                    style={{
                      borderColor: `${brandColor}33`,
                      backgroundColor: `${brandColor}0d`,
                      color: brandColor,
                    }}
                  >
                    #{activePreviewDoc === 'invoice' ? 'INV-2026-004' : activePreviewDoc === 'proposal' ? 'PROP-108' : 'QT-890'}
                  </p>
                </div>
              </div>

              {/* Recipient Billed To Box */}
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {activePreviewDoc === 'proposal' ? 'PREPARED FOR' : 'BILLED TO'}
                </p>
                <div className="border-l-3 pl-2.5 py-0.5" style={{ borderColor: brandColor }}>
                  <p className="text-xs font-bold text-slate-900">Acme Global Corp</p>
                  <p className="text-[10px] text-slate-500">client@acmeglobal.com</p>
                </div>
              </div>

              {/* Mini Itemized Table */}
              <div className="rounded-lg border border-slate-100 overflow-hidden text-[11px]">
                <div
                  className="px-3 py-1.5 flex justify-between font-bold border-b text-slate-700"
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottomColor: brandColor,
                  }}
                >
                  <span>Description</span>
                  <span>Total</span>
                </div>
                <div className="px-3 py-2 flex justify-between text-slate-800">
                  <span>Strategic Branding & Portal Solution</span>
                  <span className="font-mono font-semibold">$3,500.00</span>
                </div>
              </div>

              {/* Totals Banner */}
              <div
                className="pt-3 border-t-2 flex justify-between items-baseline"
                style={{ borderTopColor: brandColor }}
              >
                <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: brandColor }}>
                  {activePreviewDoc === 'invoice' ? 'Amount Due' : 'Estimated Total'}
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  $3,500.00
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Saved styling applies automatically across all shared client portal links
          </p>
        </div>
      </div>
    </Card>
  );
}
