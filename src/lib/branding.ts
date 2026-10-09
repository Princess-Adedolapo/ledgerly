export interface BrandSettings {
  logoUrl: string;
  brandColor: string;
}

export const DEFAULT_BRAND_COLOR = '#1e293b';

export const BRAND_COLOR_PRESETS = [
  { name: 'Corporate Slate', hex: '#1e293b', class: 'bg-slate-800' },
  { name: 'Royal Indigo', hex: '#4f46e5', class: 'bg-indigo-600' },
  { name: 'Electric Violet', hex: '#7c3aed', class: 'bg-violet-600' },
  { name: 'Ocean Cobalt', hex: '#0284c7', class: 'bg-sky-600' },
  { name: 'Emerald Forest', hex: '#059669', class: 'bg-emerald-600' },
  { name: 'Crimson Rose', hex: '#e11d48', class: 'bg-rose-600' },
  { name: 'Sunset Amber', hex: '#d97706', class: 'bg-amber-600' },
  { name: 'Teal Modern', hex: '#0d9488', class: 'bg-teal-600' },
  { name: 'Midnight Onyx', hex: '#09090b', class: 'bg-zinc-950' },
] as const;

export const BRAND_STORAGE_KEYS = {
  LOGO: 'invoice_brand_logo',
  COLOR: 'invoice_brand_color',
} as const;

/**
 * Retrieves the currently saved brand settings from local storage.
 */
export function getBrandSettings(): BrandSettings {
  try {
    const logoUrl = localStorage.getItem(BRAND_STORAGE_KEYS.LOGO) || '';
    const brandColor = localStorage.getItem(BRAND_STORAGE_KEYS.COLOR) || DEFAULT_BRAND_COLOR;
    return { logoUrl, brandColor };
  } catch {
    return { logoUrl: '', brandColor: DEFAULT_BRAND_COLOR };
  }
}

/**
 * Saves brand settings to local storage and broadcasts a custom change event.
 */
export function saveBrandSettings(settings: Partial<BrandSettings>): BrandSettings {
  const current = getBrandSettings();
  const next: BrandSettings = {
    logoUrl: settings.logoUrl !== undefined ? settings.logoUrl : current.logoUrl,
    brandColor: settings.brandColor !== undefined ? settings.brandColor : current.brandColor,
  };

  try {
    if (next.logoUrl) {
      localStorage.setItem(BRAND_STORAGE_KEYS.LOGO, next.logoUrl);
    } else {
      localStorage.removeItem(BRAND_STORAGE_KEYS.LOGO);
    }

    if (next.brandColor) {
      localStorage.setItem(BRAND_STORAGE_KEYS.COLOR, next.brandColor);
    } else {
      localStorage.setItem(BRAND_STORAGE_KEYS.COLOR, DEFAULT_BRAND_COLOR);
    }

    // Broadcast change event so other mounted components update instantly
    window.dispatchEvent(
      new CustomEvent('ledgerly:brand_settings_changed', {
        detail: next,
      })
    );
  } catch (err) {
    console.error('[branding] Failed to save brand settings:', err);
  }

  return next;
}

/**
 * Calculates whether white or dark text offers better contrast against a hex color.
 */
export function getContrastTextColor(hexColor: string): '#ffffff' | '#0f172a' {
  const cleanHex = hexColor.replace('#', '').trim();
  if (cleanHex.length !== 6 && cleanHex.length !== 3) {
    return '#ffffff';
  }
  
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map((c) => c + c).join('')
    : cleanHex;

  const r = parseInt(fullHex.substring(0, 2), 16) || 0;
  const g = parseInt(fullHex.substring(2, 4), 16) || 0;
  const b = parseInt(fullHex.substring(4, 6), 16) || 0;

  // Relative luminance formula (ITU-R BT.709)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#0f172a' : '#ffffff';
}

/**
 * Optimizes an uploaded image file (PNG/JPG/SVG/WebP) and returns a lightweight Base64 string.
 * Resizes large dimensions to fit within max width/height while maintaining aspect ratio,
 * ensuring high print quality without exceeding localStorage storage quotas.
 */
export async function processLogoImageFile(file: File): Promise<string> {
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image file is too large. Please upload an image under 5MB.');
  }

  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Unsupported image format. Please upload a PNG, JPG, WebP, or SVG file.');
  }

  // If SVG, convert directly to data URL without canvas resizing to preserve vector sharpness
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Failed to read SVG file.'));
      };
      reader.onerror = () => reject(new Error('Failed to read SVG file.'));
      reader.readAsDataURL(file);
    });
  }

  // For bitmap images, resize to max width 600px, max height 300px
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Could not read image file.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 300;
        let { width, height } = img;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Draw transparent/sharp image onto canvas
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export as PNG (preserves transparency)
        const optimized = canvas.toDataURL('image/png', 0.92);
        resolve(optimized);
      };

      img.onerror = () => reject(new Error('Failed to process image file.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Could not load image file.'));
    reader.readAsDataURL(file);
  });
}
