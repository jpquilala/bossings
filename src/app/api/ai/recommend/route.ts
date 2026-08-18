import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { recommend } from "@/server/ai";
import { rateLimit } from "@/lib/cache";
import { clientIp } from "@/lib/request";
import { publicEnv } from "@/lib/env";

const schema = z.object({ prompt: z.string().trim().min(2).max(300) });

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
      { error: "Please type a short question about what you're craving." },
      { status: 400 },
    );
  }

  // 12 recommendations per IP per 5 minutes — plenty for a real customer.
  const { allowed } = await rateLimit(`ai:recommend:${clientIp(request)}`, 12, 300);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "The recommender is not configured yet. Please browse the menu." },
      { status: 503 },
    );
  }

  try {
    const result = await recommend(parsed.data.prompt);
    if (result.suggestions.length === 0) {
      return NextResponse.json(
        { error: "Hindi ko makuha, Bossing. Try asking in another way." },
        { status: 422 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ai/recommend]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
