/**
 * Centralised env access. Public vars are inlined at build time by Next,
 * so they must be referenced as full literals — no dynamic indexing.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  storePhone: process.env.NEXT_PUBLIC_STORE_PHONE ?? "09915481541",
  messengerUrl: process.env.NEXT_PUBLIC_MESSENGER_URL ?? "",
  sentryEnabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true",
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
  /**
   * The "Ano ang bagay?" recommender and free-text order parser.
   * Off unless NEXT_PUBLIC_AI_ENABLED is exactly "true", so the feature stays
   * hidden until an OpenAI key is configured.
   */
  aiEnabled: process.env.NEXT_PUBLIC_AI_ENABLED === "true",
} as const;

/** Throws if the Supabase public config is absent — call from client factories. */
export function requireSupabasePublic() {
  return {
    url: required(publicEnv.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required(publicEnv.supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

/** Server-only secrets. Never import this into a client component. */
export const serverEnv = {
  get serviceRoleKey() {
    return required(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  },
  get openaiKey() {
    return required(process.env.OPENAI_API_KEY, "OPENAI_API_KEY");
  },
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5-nano",
  redisUrl: process.env.REDIS_URL ?? "",
} as const;
