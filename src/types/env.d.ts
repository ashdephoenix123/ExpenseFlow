declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_ASK_AI_DAILY_TOKEN_QUOTA?: string;
    EXPO_PUBLIC_ASK_AI_ESTIMATED_USD_PER_1K_TOKENS?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    ASK_AI_DAILY_TOKEN_QUOTA?: string;
    ASK_AI_ESTIMATED_USD_PER_1K_TOKENS?: string;
  }
}
