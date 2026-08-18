"use client";

import * as React from "react";
import { CheckIcon, CopyIcon, MessageCircleIcon, SmartphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildMessengerLink, buildSmsLink } from "@/lib/order-message";
import { STORE } from "@/lib/store";

/**
 * Hands the finished order to the stall over SMS or Messenger. Messenger
 * cannot prefill a message, so the copy button pairs with it.
 */
export function SendOrderButtons({ message }: { message: string }) {
  const [copied, setCopied] = React.useState(false);
  const messengerUrl = buildMessengerLink();

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      // Clipboard blocked — the message is visible on screen to copy manually.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button asChild variant="brand" size="lg" className="w-full">
        <a href={buildSmsLink(message)}>
          <SmartphoneIcon className="size-4" />
          Send by SMS
        </a>
      </Button>

      {messengerUrl && (
        <Button asChild variant="outline" size="lg" className="w-full">
          <a href={messengerUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircleIcon className="size-4" />
            Send on Messenger
          </a>
        </Button>
      )}

      <Button variant="ghost" size="sm" onClick={copy} className="w-full">
        {copied ? (
          <>
            <CheckIcon className="size-4" />
            Copied!
          </>
        ) : (
          <>
            <CopyIcon className="size-4" />
            Copy order details
          </>
        )}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        Or call us at{" "}
        <a
          href={`tel:+63${STORE.phoneDigits.slice(1)}`}
          className="text-brand-600 font-semibold underline underline-offset-2"
        >
          {STORE.phoneDisplay}
        </a>
      </p>
    </div>
  );
}
