import type { NextConfig } from "next";

/**
 * Supabase Storage host, derived from NEXT_PUBLIC_SUPABASE_URL so product
 * images served from the public "products" bucket pass through next/image.
 */
function supabaseHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const host = supabaseHostname();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      ...(host
        ? ([
            {
              protocol: "https" as const,
              hostname: host,
              pathname: "/storage/v1/object/public/**",
            },
          ])
        : []),
      // OAuth avatars (Google / Facebook).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
    ],
  },

  experimental: {
    // Keeps the Server Action payload small; cart lines are tiny.
    serverActions: { bodySizeLimit: "1mb" },
  },
};

/**
 * Sentry is wired but inert until NEXT_PUBLIC_SENTRY_ENABLED="true" and the
 * SDK is installed:
 *
 *   npm install @sentry/nextjs
 *
 * then uncomment the block below.
 */
// import { withSentryConfig } from "@sentry/nextjs";
// export default process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true"
//   ? withSentryConfig(nextConfig, {
//       org: process.env.SENTRY_ORG,
//       project: process.env.SENTRY_PROJECT,
//       authToken: process.env.SENTRY_AUTH_TOKEN,
//       silent: true,
//       widenClientFileUpload: true,
//       disableLogger: true,
//     })
//   : nextConfig;

export default nextConfig;
