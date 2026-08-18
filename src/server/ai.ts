import "server-only";
import OpenAI from "openai";
import { serverEnv } from "@/lib/env";
import { getMenuProducts } from "@/server/menu";
import { formatPeso } from "@/lib/currency";

let client: OpenAI | null = null;

function getClient() {
  if (!client) client = new OpenAI({ apiKey: serverEnv.openaiKey });
  return client;
}

/** Menu context handed to the model. IDs are what we match suggestions against. */
export async function buildMenuContext() {
  const products = await getMenuProducts();

  const lines = products.map((product) => {
    const prices =
      product.variants.length > 0
        ? product.variants
            .map((variant) => `${variant.label}=${formatPeso(variant.price)} [variantId:${variant.id}]`)
            .join(", ")
        : formatPeso(product.basePrice);

    return `- id:${product.id} | ${product.name} | ${product.categoryName} | ${prices} | ${
      product.description ?? "no description"
    }`;
  });

  return { products, menuText: lines.join("\n") };
}

const RECOMMEND_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "suggestions"],
  properties: {
    reply: {
      type: "string",
      description:
        "One short friendly Taglish sentence explaining the picks. Max 140 characters.",
    },
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["productId", "variantId", "quantity", "reason"],
        properties: {
          productId: { type: "string", description: "Must be an id from the menu." },
          variantId: {
            type: ["string", "null"],
            description: "Variant id when the product has sizes, otherwise null.",
          },
          quantity: { type: "integer", minimum: 1, maximum: 10 },
          reason: { type: "string", description: "Max 60 characters, Taglish is fine." },
        },
      },
    },
  },
} as const;

const PARSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "unmatched"],
  properties: {
    items: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["productId", "variantId", "quantity"],
        properties: {
          productId: { type: "string" },
          variantId: { type: ["string", "null"] },
          quantity: { type: "integer", minimum: 1, maximum: 50 },
        },
      },
    },
    unmatched: {
      type: "array",
      maxItems: 10,
      items: { type: "string" },
      description: "Phrases from the input that matched no menu item.",
    },
  },
} as const;

export type AiSuggestion = {
  productId: string;
  variantId: string | null;
  quantity: number;
  reason: string;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
};

/** "Ano ang bagay?" — mood/budget in, 2-3 real menu items out. */
export async function recommend(prompt: string) {
  const { products, menuText } = await buildMenuContext();

  const response = await getClient().responses.create({
    model: serverEnv.openaiModel,
    instructions: [
      "You are the friendly counter staff at Bossing's Flying Saucer, a Filipino street-food stall in San Pablo City, Laguna.",
      "Recommend 2 to 3 items from the MENU below based on the customer's mood, craving or budget.",
      "Hard rules: only ever use productId and variantId values copied verbatim from the MENU. Never invent an item, a price, or an id.",
      "If the customer names a budget in pesos, keep the suggested total at or under it.",
      "Reply in warm Taglish, one short sentence. Keep it under 140 characters.",
      "",
      "MENU:",
      menuText,
    ].join("\n"),
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "recommendation",
        strict: true,
        schema: RECOMMEND_SCHEMA,
      },
    },
    max_output_tokens: 700,
  });

  const parsed = JSON.parse(response.output_text) as {
    reply: string;
    suggestions: {
      productId: string;
      variantId: string | null;
      quantity: number;
      reason: string;
    }[];
  };

  return {
    reply: parsed.reply,
    suggestions: hydrate(parsed.suggestions, products),
  };
}

/** Free-text order parsing: "2 asado 1 gulaman malaki" -> cart lines. */
export async function parseOrder(text: string) {
  const { products, menuText } = await buildMenuContext();

  const response = await getClient().responses.create({
    model: serverEnv.openaiModel,
    instructions: [
      "You convert a Filipino customer's free-text order into structured line items for Bossing's Flying Saucer.",
      "The text mixes Tagalog and English. Common hints: 'malaki'/'large' means the bigger size, 'maliit'/'regular' the smaller one.",
      "Numbers before an item are quantities. 'tig-dalawa' means two each.",
      "Hard rules: only use productId and variantId values copied verbatim from the MENU. Never invent items.",
      "If a product has variants and the customer did not specify a size, choose the smaller (cheaper) variant.",
      "Put any phrase you could not match into `unmatched`.",
      "",
      "MENU:",
      menuText,
    ].join("\n"),
    input: text,
    text: {
      format: {
        type: "json_schema",
        name: "parsed_order",
        strict: true,
        schema: PARSE_SCHEMA,
      },
    },
    max_output_tokens: 700,
  });

  const parsed = JSON.parse(response.output_text) as {
    items: { productId: string; variantId: string | null; quantity: number }[];
    unmatched: string[];
  };

  return {
    items: hydrate(
      parsed.items.map((item) => ({ ...item, reason: "" })),
      products,
    ),
    unmatched: parsed.unmatched,
  };
}

/**
 * Resolves model output against the live menu. Anything the model invented is
 * dropped here — the UI only ever renders real, in-stock products.
 */
function hydrate(
  suggestions: {
    productId: string;
    variantId: string | null;
    quantity: number;
    reason: string;
  }[],
  products: Awaited<ReturnType<typeof getMenuProducts>>,
): AiSuggestion[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const seen = new Set<string>();
  const result: AiSuggestion[] = [];

  for (const suggestion of suggestions) {
    const product = byId.get(suggestion.productId);
    if (!product || !product.isAvailable) continue;

    let variantId = suggestion.variantId;
    let unitPrice = product.basePrice;
    let name = product.name;

    if (product.variants.length > 0) {
      const variant =
        product.variants.find((v) => v.id === variantId) ??
        product.variants.find((v) => v.isDefault) ??
        product.variants[0];
      variantId = variant.id;
      unitPrice = variant.price;
      name = `${product.name} (${variant.label})`;
    } else {
      variantId = null;
    }

    const key = variantId ? `${product.id}:${variantId}` : product.id;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      productId: product.id,
      variantId,
      quantity: Math.min(50, Math.max(1, suggestion.quantity)),
      reason: suggestion.reason,
      name,
      unitPrice,
      imageUrl: product.imageUrl,
    });
  }

  return result;
}
