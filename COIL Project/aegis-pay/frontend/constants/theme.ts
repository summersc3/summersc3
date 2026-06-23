/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';


const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

// Primary colors
const primary = '#009669';
const primaryLight = '#37dcaa';
const primaryDark = '#0b7254';

// Semantic colors
const success = '#10b981';
const error = '#ef4444';
const warning = '#f59e0b';
const info = '#3b82f6';

export const Colors = {
  primary,
  primaryLight,
  primaryDark,
  success,
  error,
  warning,
  info,
  
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    placeholder: '#9ca3af',
    muted: '#d1d5db',
    light: '#f3f4f6',
  },
  
  surface: '#ffffff',
  background: '#f9fafb',
  offWhite: '#f9fafb',
  darkGray: '#6b7280',
  lightGray: '#e5e7eb',
  navy: '#0A1220',
  beige: '#FBF2ED',
  
  border: {
    default: '#e5e7eb',
    focus: primary,
    error,
  },
  
  status: {
    success,
    error,
    warning,
    info,
  },
  
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    xxl: 24,
    '3xl': 30,
    xxxl: 30,
  },
  fontWeights: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  base: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  xxl: 48,
  xxxl: 64,
};

export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
