import { MailIcon } from "lucide-react";

/** Human-readable name for each supported sign-in method. */
export const PROVIDER_LABEL: Record<string, string> = {
  facebook: "Facebook",
  google: "Google",
  email: "Email & password",
};

/**
 * Small brand mark for the sign-in provider.
 *
 * Server-rendered inline SVG rather than remote brand assets: no extra
 * request, and nothing to break if a CDN changes its URLs.
 */
export function ProviderIcon({
  provider,
  className = "size-4",
}: {
  provider: string;
  className?: string;
}) {
  if (provider === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path
          fill="#1877F2"
          d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
        />
      </svg>
    );
  }

  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path
          fill="#4285F4"
          d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.46Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.1 0 5.7-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.98A11.5 11.5 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.55 14.67a6.9 6.9 0 0 1 0-4.4V7.29H1.7a11.5 11.5 0 0 0 0 10.36l3.85-2.98Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.29-3.29C17.7 1.2 15.1 0 12 0 7.5 0 3.62 2.58 1.7 6.34l3.85 2.98C6.46 6.78 9 4.75 12 4.75Z"
        />
      </svg>
    );
  }

  return <MailIcon className={className} aria-hidden />;
}
