import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parseOrder } from "@/server/ai";
import { rateLimit } from "@/lib/cache";
import { clientIp } from "@/lib/request";
import { publicEnv } from "@/lib/env";

const schema = z.object({ text: z.string().trim().min(2).max(400) });

export async function POST(request: NextRequest) {
  // Hiding the UI is not enough — the endpoint would still be callable, and it
  // costs money per request. Refuse before doing any work.
  if (!publicEnv.aiEnabled) {
    return NextResponse.json({ error: "This feature is disabled." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please type your order, e.g. "2 asado 1 gulaman malaki".' },
      { status: 400 },
    );
  }

  const { allowed } = await rateLimit(`ai:parse:${clientIp(request)}`, 12, 300);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Order parsing is not configured yet. Please use the menu." },
      { status: 503 },
    );
  }

  try {
    const result = await parseOrder(parsed.data.text);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ai/parse-order]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
