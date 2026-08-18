import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/cache";
import { clientIp } from "@/lib/request";

const schema = z.object({
  orderNumbers: z.array(z.string().trim().min(4).max(32)).min(1).max(10),
});

/**
 * Status lookup for the notification bell. Returns only the status, keyed by
 * order number — the number is the capability the customer already holds.
 */
export async function POST(request: NextRequest) {
  const { allowed } = await rateLimit(`orders:status:${clientIp(request)}`, 120, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: { orderNumber: { in: parsed.data.orderNumbers } },
      select: { orderNumber: true, status: true },
    });
    return NextResponse.json({ orders });
  } catch (error) {
    // The bell polls this on a timer; a database blip must not spam 500s.
    // An empty list simply leaves the last known status in place.
    console.error("[api/orders/status]", error);
    return NextResponse.json({ orders: [] });
  }
}
