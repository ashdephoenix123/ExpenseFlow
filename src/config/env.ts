/**
 * Centralized environment configuration.
 * Expo automatically inlines EXPO_PUBLIC_* variables at build time.
 */
export const SUPABASE_URL: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';

export const SUPABASE_ANON_KEY: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const ASK_AI_DAILY_TOKEN_QUOTA: string =
  process.env.EXPO_PUBLIC_ASK_AI_DAILY_TOKEN_QUOTA ||
  process.env.ASK_AI_DAILY_TOKEN_QUOTA ||
  '25000';

export const ASK_AI_ESTIMATED_USD_PER_1K_TOKENS: string =
  process.env.EXPO_PUBLIC_ASK_AI_ESTIMATED_USD_PER_1K_TOKENS ||
  process.env.ASK_AI_ESTIMATED_USD_PER_1K_TOKENS ||
  '0.0004';
