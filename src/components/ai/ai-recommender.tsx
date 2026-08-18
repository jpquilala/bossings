"use client";

import * as React from "react";
import Image from "next/image";
import {
  AlertCircleIcon,
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  WandSparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SaucerMark } from "@/components/brand/logo";
import { useCart } from "@/components/cart/cart-provider";
import { formatPeso } from "@/lib/currency";
import { cn } from "@/lib/utils";

type Suggestion = {
  productId: string;
  variantId: string | null;
  quantity: number;
  reason: string;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
};

type Mode = "recommend" | "parse";

const EXAMPLES: Record<Mode, string[]> = {
  recommend: ["Gutom na gutom, P100 budget", "Something sweet and filling", "Meryenda for two"],
  parse: ["2 asado 1 gulaman malaki", "3 giniling, 2 lemon juice"],
};

export function AiRecommender() {
  const cart = useCart();
  const [mode, setMode] = React.useState<Mode>("recommend");
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reply, setReply] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [unmatched, setUnmatched] = React.useState<string[]>([]);
  const [addedAll, setAddedAll] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2 || loading) return;

    setLoading(true);
    setError(null);
    setReply(null);
    setSuggestions([]);
    setUnmatched([]);
    setAddedAll(false);

    try {
      const endpoint = mode === "recommend" ? "/api/ai/recommend" : "/api/ai/parse-order";
      const payload = mode === "recommend" ? { prompt: trimmed } : { text: trimmed };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (mode === "recommend") {
        setReply(data.reply ?? null);
        setSuggestions(data.suggestions ?? []);
      } else {
        setSuggestions(data.items ?? []);
        setUnmatched(data.unmatched ?? []);
        if ((data.items ?? []).length === 0) {
          setError("Walang na-match sa menu. Try naming the items directly.");
        }
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function addOne(suggestion: Suggestion) {
    cart.add({
      productId: suggestion.productId,
      variantId: suggestion.variantId,
      name: suggestion.name,
      unitPrice: suggestion.unitPrice,
      imageUrl: suggestion.imageUrl,
      quantity: suggestion.quantity,
    });
  }

  function addAll() {
    suggestions.forEach(addOne);
    setAddedAll(true);
  }

  const total = suggestions.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);

  return (
    <Card className="border-brand-200 overflow-hidden">
      <div className="bg-brand-gradient relative overflow-hidden px-5 py-4 text-white">
        <div className="sunburst pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative flex items-center gap-2">
          <WandSparklesIcon className="size-5 shrink-0" />
          <div>
            <h2 className="text-lg leading-tight">Ano ang bagay?</h2>
            <p className="text-sm text-white/85">
              Tell us your mood or budget — or just type your order.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* Mode switch */}
        <div
          role="radiogroup"
          aria-label="Assistant mode"
          className="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1"
        >
          {(
            [
              { id: "recommend", label: "Suggest for me" },
              { id: "parse", label: "Type my order" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={mode === option.id}
              onClick={() => {
                setMode(option.id);
                setSuggestions([]);
                setReply(null);
                setError(null);
                setUnmatched([]);
              }}
              className={cn(
                "focus-visible:ring-ring min-h-11 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                mode === option.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Label htmlFor="ai-input">
            {mode === "recommend" ? "What are you craving?" : "Your order"}
          </Label>
          <div className="flex gap-2">
            <Input
              id="ai-input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={
                mode === "recommend"
                  ? "Gutom na gutom, P100 budget"
                  : "2 asado 1 gulaman malaki"
              }
              maxLength={mode === "recommend" ? 300 : 400}
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="brand"
              disabled={loading || value.trim().length < 2}
              className="shrink-0"
            >
              {loading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  <span className="sr-only">Thinking</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="size-4" />
                  <span className="hidden sm:inline">Ask</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES[mode].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setValue(example)}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {example}
              </button>
            ))}
          </div>
        </form>

        {error && (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {reply && (
          <p className="bg-gold-300/25 border-gold-500/40 rounded-lg border px-3 py-2 text-sm font-medium">
            {reply}
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="flex flex-col gap-3">
            {mode === "parse" && (
              <p className="text-muted-foreground text-sm">
                Here&apos;s what we understood. Confirm before adding to your cart.
              </p>
            )}

            <ul className="flex flex-col gap-2">
              {suggestions.map((suggestion) => (
                <li
                  key={`${suggestion.productId}:${suggestion.variantId ?? "base"}`}
                  className="border-border flex items-center gap-3 rounded-xl border p-3"
                >
                  <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-lg">
                    {suggestion.imageUrl ? (
                      <Image
                        src={suggestion.imageUrl}
                        alt={suggestion.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center">
                        <SaucerMark className="size-8 opacity-50" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {suggestion.quantity}× {suggestion.name}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">
                      {suggestion.reason || formatPeso(suggestion.unitPrice) + " each"}
                    </p>
                  </div>

                  <span className="font-display shrink-0 text-base">
                    {formatPeso(suggestion.unitPrice * suggestion.quantity)}
                  </span>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => addOne(suggestion)}
                    aria-label={`Add ${suggestion.quantity} ${suggestion.name} to cart`}
                    className="shrink-0"
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>

            {unmatched.length > 0 && (
              <p className="text-muted-foreground text-sm">
                Hindi namin makita sa menu:{" "}
                <span className="font-semibold">{unmatched.join(", ")}</span>
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-sm">
                Total:{" "}
                <span className="text-foreground font-display text-base">
                  {formatPeso(total)}
                </span>
              </span>
              <Button variant={addedAll ? "gold" : "brand"} onClick={addAll}>
                {addedAll ? (
                  <>
                    <CheckIcon className="size-4" />
                    Added to cart
                  </>
                ) : (
                  "Add all to cart"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
