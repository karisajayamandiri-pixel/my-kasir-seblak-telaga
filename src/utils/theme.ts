import { AppSettings, ThemeColorId } from '../types';

export const DEFAULT_BUSINESS_NAME = 'TELAGA WARNA';
export const DEFAULT_TAGLINE = 'Pedas Gurih Bikin Nagih';
export const DEFAULT_LOGO_URL = '/assets/logo-telaga-warna.png';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'branding',
  namaUsaha: DEFAULT_BUSINESS_NAME,
  tagline: DEFAULT_TAGLINE,
  logoUrl: DEFAULT_LOGO_URL,
  temaWarna: 'sunset',
  modeTampilan: 'light',
};

export interface ThemePresetDefinition {
  id: ThemeColorId;
  nama: string;
  deskripsi: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  primary: string;
  primaryHover: string;
  accent: string;
  softBg: string;
  softBorder: string;
  softText: string;
  ring: string;
  loginBgFrom: string;
  loginBgVia: string;
  loginBgTo: string;
  swatchHex: [string, string];
}

export const THEME_COLOR_PRESETS: ThemePresetDefinition[] = [
  {
    id: 'sunset',
    nama: 'Merah Oranye (Default)',
    deskripsi: 'Khas signature hangat & enerjik',
    gradientFrom: '#dc2626',
    gradientVia: '#ea580c',
    gradientTo: '#d97706',
    primary: '#ea580c',
    primaryHover: '#c2410c',
    accent: '#e53935',
    softBg: '#fff7ed',
    softBorder: '#fed7aa',
    softText: '#c2410c',
    ring: 'rgba(234, 88, 12, 0.35)',
    loginBgFrom: '#fffbeb',
    loginBgVia: '#fff7ed',
    loginBgTo: '#fee2e2',
    swatchHex: ['#e53935', '#ff6f00'],
  },
  {
    id: 'ocean',
    nama: 'Biru Samudra',
    deskripsi: 'Profesional, bersih & modern',
    gradientFrom: '#1d4ed8',
    gradientVia: '#0284c7',
    gradientTo: '#0891b2',
    primary: '#0284c7',
    primaryHover: '#0369a1',
    accent: '#2563eb',
    softBg: '#f0f9ff',
    softBorder: '#bae6fd',
    softText: '#0369a1',
    ring: 'rgba(2, 132, 199, 0.35)',
    loginBgFrom: '#eff6ff',
    loginBgVia: '#f0f9ff',
    loginBgTo: '#ecfeff',
    swatchHex: ['#1d4ed8', '#0891b2'],
  },
  {
    id: 'emerald',
    nama: 'Hijau Zamrud',
    deskripsi: 'Segar, natural & tenang',
    gradientFrom: '#047857',
    gradientVia: '#059669',
    gradientTo: '#0d9488',
    primary: '#059669',
    primaryHover: '#047857',
    accent: '#10b981',
    softBg: '#ecfdf5',
    softBorder: '#a7f3d0',
    softText: '#047857',
    ring: 'rgba(5, 150, 105, 0.35)',
    loginBgFrom: '#ecfdf5',
    loginBgVia: '#f0fdf4',
    loginBgTo: '#f0fdfa',
    swatchHex: ['#047857', '#0d9488'],
  },
  {
    id: 'royal',
    nama: 'Ungu Royal',
    deskripsi: 'Kreatif, tegas & kontemporer',
    gradientFrom: '#5b21b6',
    gradientVia: '#7c3aed',
    gradientTo: '#c026d3',
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
    accent: '#9333ea',
    softBg: '#f5f3ff',
    softBorder: '#ddd6fe',
    softText: '#6d28d9',
    ring: 'rgba(124, 58, 237, 0.35)',
    loginBgFrom: '#f5f3ff',
    loginBgVia: '#faf5ff',
    loginBgTo: '#fdf4ff',
    swatchHex: ['#6d28d9', '#c026d3'],
  },
  {
    id: 'amber',
    nama: 'Karamel Emas',
    deskripsi: 'Hangat premium & berkelas',
    gradientFrom: '#78350f',
    gradientVia: '#b45309',
    gradientTo: '#d97706',
    primary: '#b45309',
    primaryHover: '#92400e',
    accent: '#d97706',
    softBg: '#fffbeb',
    softBorder: '#fde68a',
    softText: '#92400e',
    ring: 'rgba(180, 83, 9, 0.35)',
    loginBgFrom: '#fffbeb',
    loginBgVia: '#fef3c7',
    loginBgTo: '#ffedd5',
    swatchHex: ['#78350f', '#d97706'],
  },
  {
    id: 'slate',
    nama: 'Monokrom Elegan',
    deskripsi: 'Minimalis kontras tinggi',
    gradientFrom: '#0f172a',
    gradientVia: '#1e293b',
    gradientTo: '#334155',
    primary: '#1e293b',
    primaryHover: '#0f172a',
    accent: '#475569',
    softBg: '#f8fafc',
    softBorder: '#cbd5e1',
    softText: '#334155',
    ring: 'rgba(51, 65, 85, 0.35)',
    loginBgFrom: '#f8fafc',
    loginBgVia: '#f1f5f9',
    loginBgTo: '#e2e8f0',
    swatchHex: ['#0f172a', '#475569'],
  },
];

export function getThemePreset(id?: ThemeColorId): ThemePresetDefinition {
  return THEME_COLOR_PRESETS.find((t) => t.id === id) || THEME_COLOR_PRESETS[0];
}

export function normalizeAppSettings(raw?: Partial<AppSettings> | null): AppSettings {
  return {
    id: raw?.id || 'branding',
    namaUsaha: (raw?.namaUsaha || DEFAULT_BUSINESS_NAME).trim() || DEFAULT_BUSINESS_NAME,
    tagline: raw?.tagline !== undefined ? raw.tagline : DEFAULT_TAGLINE,
    logoUrl: (raw?.logoUrl || DEFAULT_LOGO_URL).trim() || DEFAULT_LOGO_URL,
    temaWarna: THEME_COLOR_PRESETS.some((t) => t.id === raw?.temaWarna)
      ? (raw?.temaWarna as ThemeColorId)
      : 'sunset',
    modeTampilan: raw?.modeTampilan === 'dark' ? 'dark' : 'light',
    updatedAt: raw?.updatedAt,
    updatedBy: raw?.updatedBy,
  };
}

export function getBusinessHandle(namaUsaha: string): string {
  const clean = (namaUsaha || DEFAULT_BUSINESS_NAME)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return clean || 'telagawarna';
}

export function replaceBusinessNameText(
  text: string | undefined,
  oldName: string,
  newName: string
): string | undefined {
  if (!text) return text;
  const trimmedOld = oldName.trim();
  const trimmedNew = newName.trim();
  if (!trimmedOld || !trimmedNew || trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) {
    return text;
  }
  const escaped = trimmedOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  return text.replace(regex, (matched) => {
    if (matched === matched.toUpperCase()) return trimmedNew.toUpperCase();
    return trimmedNew;
  });
}

export function applyAppTheme(settings: AppSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const preset = getThemePreset(settings.temaWarna);
  const isDark = settings.modeTampilan === 'dark';

  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme-mode', settings.modeTampilan);
  root.setAttribute('data-brand-theme', preset.id);

  root.style.setProperty('--brand-from', preset.gradientFrom);
  root.style.setProperty('--brand-via', preset.gradientVia);
  root.style.setProperty('--brand-to', preset.gradientTo);
  root.style.setProperty('--brand-primary', preset.primary);
  root.style.setProperty('--brand-primary-hover', preset.primaryHover);
  root.style.setProperty('--brand-accent', preset.accent);
  root.style.setProperty('--brand-soft-bg', isDark ? 'rgba(30, 41, 59, 0.7)' : preset.softBg);
  root.style.setProperty('--brand-soft-border', isDark ? '#334155' : preset.softBorder);
  root.style.setProperty('--brand-soft-text', isDark ? '#e2e8f0' : preset.softText);
  root.style.setProperty('--brand-ring', preset.ring);
  root.style.setProperty('--brand-login-from', isDark ? '#020617' : preset.loginBgFrom);
  root.style.setProperty('--brand-login-via', isDark ? '#0f172a' : preset.loginBgVia);
  root.style.setProperty('--brand-login-to', isDark ? '#1e293b' : preset.loginBgTo);
}

export function syncDocumentBranding(settings: AppSettings): void {
  if (typeof document === 'undefined') return;
  const namaUsaha = settings.namaUsaha || DEFAULT_BUSINESS_NAME;
  const pageTitle = `My Kasir POS ${namaUsaha}`;
  document.title = pageTitle;

  const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (iconLink && settings.logoUrl) {
    iconLink.href = settings.logoUrl;
  }

  const descContent = `Sistem Kasir POS & Manajemen Multi-Cabang ${namaUsaha}`;
  const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (metaDesc) metaDesc.content = descContent;
  const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = pageTitle;
  const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = descContent;
}
