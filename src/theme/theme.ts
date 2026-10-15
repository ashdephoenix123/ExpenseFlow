import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  canvasBase: string;
  surfaceLow: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceElevated: string;
  border: string;
  borderLight: string;
  borderHairline: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  tertiary: string;
  error: string;
  accent: string;
  inflow: string;
  inflowBg: string;
  outflow: string;
  outflowBg: string;
  card: string;
  inputBg: string;
  pillBg: string;
  activePillBg: string;
  activePillText: string;
  iconBg: string;
}

// ── Warm Editorial Dark (from design specification) ──
export const warmEditorialDarkColors: ThemeColors = {
  background: '#141312',
  surface: '#141312',
  canvasBase: '#141312',
  surfaceLow: '#1C1B1A',
  surfaceContainerLowest: '#0F0E0D',
  surfaceContainerLow: '#1C1B1A',
  surfaceContainer: '#211F1E',
  surfaceContainerHigh: '#2B2A28',
  surfaceContainerHighest: '#363433',
  surfaceElevated: '#2B2A28',
  border: '#2D2A26',
  borderLight: '#363433',
  borderHairline: '#2D2A26',
  textPrimary: '#F5F3EF',
  textSecondary: '#D4D0C7',
  textMuted: '#9E9A91',
  onSurface: '#F5F3EF',
  onSurfaceVariant: '#D4C4B5',
  outline: '#9D8E81',
  outlineVariant: '#2D2A26',
  primary: '#E0A96D', // warm burnished amber
  onPrimary: '#141312',
  primaryContainer: '#362818',
  onPrimaryContainer: '#FEC486',
  secondary: '#8FA382', // dried sage green
  tertiary: '#C97A63', // earthy terracotta
  error: '#FFB4AB',
  accent: '#E0A96D',
  inflow: '#8FA382',
  inflowBg: 'rgba(143, 163, 130, 0.12)',
  outflow: '#C97A63',
  outflowBg: 'rgba(201, 122, 99, 0.12)',
  card: '#211F1E',
  inputBg: '#1C1B1A',
  pillBg: '#1C1B1A',
  activePillBg: '#E0A96D',
  activePillText: '#141312',
  iconBg: '#211F1E',
};

// ── Clean Minimalist Light ──
export const cleanLightColors: ThemeColors = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  canvasBase: '#F8F9FA',
  surfaceLow: '#F3F4F6',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F9FAFB',
  surfaceContainer: '#FFFFFF',
  surfaceContainerHigh: '#F3F4F6',
  surfaceContainerHighest: '#E5E7EB',
  surfaceElevated: '#FFFFFF',
  border: '#F0F1F3',
  borderLight: '#E5E7EB',
  borderHairline: '#F0F1F3',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  onSurface: '#111827',
  onSurfaceVariant: '#6B7280',
  outline: '#9CA3AF',
  outlineVariant: '#E5E7EB',
  primary: '#18181B',
  onPrimary: '#FFFFFF',
  primaryContainer: '#F3F4F6',
  onPrimaryContainer: '#18181B',
  secondary: '#15803D',
  tertiary: '#DC2626',
  error: '#DC2626',
  accent: '#18181B',
  inflow: '#15803D',
  inflowBg: '#ECFDF5',
  outflow: '#DC2626',
  outflowBg: '#FEE2E2',
  card: '#FFFFFF',
  inputBg: '#F9FAFB',
  pillBg: '#F3F4F6',
  activePillBg: '#18181B',
  activePillText: '#FFFFFF',
  iconBg: '#F3F4F6',
};

export const themeFonts = {
  regular: 'GoogleSans-Regular',
  medium: 'GoogleSans-Medium',
  semiBold: 'GoogleSans-SemiBold',
  bold: 'GoogleSans-Bold',
  serif: 'PlayfairDisplay-Regular',
  serifMedium: 'PlayfairDisplay-Medium',
  serifSemiBold: 'PlayfairDisplay-SemiBold',
  serifBold: 'PlayfairDisplay-Bold',
  display: 'GoogleSans-Regular',
  displayMedium: 'GoogleSans-Medium',
  displaySemiBold: 'GoogleSans-SemiBold',
  displayBold: 'GoogleSans-Bold',
};

export const themeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const themeBorderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 20,
  round: 9999,
};

// ── Persistence Store for Theme Mode ──
const THEME_STORAGE_KEY = '@expenseflow_theme_mode';

interface ThemeStoreState {
  themeMode: ThemeMode;
  initialized: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  themeMode: 'system',
  initialized: false,
  setThemeMode: async (mode) => {
    set({ themeMode: mode });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to persist theme mode:', e);
    }
  },
  initializeTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        set({ themeMode: saved, initialized: true });
        return;
      }
    } catch (e) {
      console.warn('Failed to load theme mode:', e);
    }
    set({ themeMode: 'system', initialized: true });
  },
}));

// Automatically initialize once on module load
useThemeStore.getState().initializeTheme();

// ── Reactive Hook ──
export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);

  const isDark =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
      : themeMode === 'dark';

  const colors = isDark ? warmEditorialDarkColors : cleanLightColors;

  return {
    themeMode,
    setThemeMode,
    isDark,
    colors,
    fonts: themeFonts,
    spacing: themeSpacing,
    borderRadius: themeBorderRadius,
  };
};

// ── Backwards-compatible theme export ──
export const theme = {
  colors: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    primary: '#18181B',
    secondary: '#E0A96D',
    error: '#DC2626',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#F0F1F3',
    success: '#15803D',
    card: '#FFFFFF',
  },
  fonts: themeFonts,
  spacing: themeSpacing,
  borderRadius: themeBorderRadius,
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '600' as const,
      color: '#111827',
      fontFamily: themeFonts.bold,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      color: '#111827',
      fontFamily: themeFonts.bold,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: '#111827',
      fontFamily: themeFonts.semiBold,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal' as const,
      color: '#111827',
      fontFamily: themeFonts.regular,
    },
    caption: {
      fontSize: 14,
      fontWeight: 'normal' as const,
      color: '#6B7280',
      fontFamily: themeFonts.medium,
    },
    small: {
      fontSize: 12,
      fontWeight: 'normal' as const,
      color: '#9CA3AF',
      fontFamily: themeFonts.regular,
    },
  },
};
