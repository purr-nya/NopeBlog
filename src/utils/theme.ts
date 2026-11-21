import type { RadiusStyle, ThemeMode } from '../types/blog';

export interface HuePreset {
  name: string;
  hue: number;
  swatch: string;
}

export const HUE_PRESETS: HuePreset[] = [
  { name: '晴空靛', hue: 250, swatch: 'oklch(0.58 0.16 250)' },
  { name: '翡翠青', hue: 168, swatch: 'oklch(0.58 0.14 168)' },
  { name: '绯樱红', hue: 352, swatch: 'oklch(0.58 0.17 352)' },
  { name: '琥珀暖', hue: 46, swatch: 'oklch(0.64 0.16 46)' },
  { name: '暮霭紫', hue: 292, swatch: 'oklch(0.58 0.16 292)' },
];

export interface RadiusTokens {
  card: string;
  inner: string;
  control: string;
}

export function clampHue(hue: number): number {
  if (!Number.isFinite(hue)) return 250;
  const mod = Math.round(hue) % 360;
  return mod < 0 ? mod + 360 : mod;
}

export function getRadiusTokens(style: RadiusStyle): RadiusTokens {
  switch (style) {
    case 'expressive':
      return { card: '28px', inner: '20px', control: '16px' };
    case 'balanced':
      return { card: '18px', inner: '12px', control: '10px' };
    case 'sharp':
      return { card: '6px', inner: '4px', control: '4px' };
  }
}

export function resolveEffectiveDark(mode: ThemeMode, systemPrefersDark: boolean): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemPrefersDark;
}

export function computeExpressivePalette(hue: number, isDark: boolean): Record<string, string> {
  const h = clampHue(hue);
  if (isDark) {
    return {
      '--hue': String(h),
      '--md-surface': `oklch(0.155 0.014 ${h})`,
      '--md-primary': `oklch(0.76 0.135 ${h})`,
      '--md-primary-container': `oklch(0.32 0.095 ${h})`,
      '--md-on-surface': `oklch(0.935 0.012 ${h})`,
    };
  }
  return {
    '--hue': String(h),
    '--md-surface': `oklch(0.978 0.008 ${h})`,
    '--md-primary': `oklch(0.52 0.165 ${h})`,
    '--md-primary-container': `oklch(0.90 0.062 ${h})`,
    '--md-on-surface': `oklch(0.205 0.022 ${h})`,
  };
}

export function applyThemeToDocument(
  hue: number,
  radiusStyle: RadiusStyle,
  isDark: boolean,
  origin?: { x: number; y: number }
): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const safeHue = clampHue(hue);
  const radii = getRadiusTokens(radiusStyle);

  const commit = () => {
    root.style.setProperty('--hue', String(safeHue));
    root.style.setProperty('--radius-card', radii.card);
    root.style.setProperty('--radius-inner', radii.inner);
    root.style.setProperty('--radius-control', radii.control);
    root.classList.toggle('dark', isDark);
  };

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const docWithVT = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (origin && docWithVT.startViewTransition && !prefersReducedMotion) {
    const maxRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    );
    root.style.setProperty('--ripple-x', `${origin.x}px`);
    root.style.setProperty('--ripple-y', `${origin.y}px`);
    root.style.setProperty('--ripple-r', `${Math.ceil(maxRadius)}px`);
    docWithVT.startViewTransition(commit);
  } else {
    commit();
  }
}
