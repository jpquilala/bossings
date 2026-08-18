"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionProfile, isStaff } from "@/server/profile";
import { invalidateMenuCache } from "@/server/menu";
import { invalidateAnalyticsCache } from "@/server/analytics";

const schema = z.object({
  orderId: z.string().uuid(),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "COMPLETED",
    "CANCELLED",
  ]),
});

export type UpdateStatusResult = { ok: boolean; error?: string };

/**
 * Staff-only status transition. The role is checked here as well as by RLS —
 * a Server Action is a public endpoint, so it must authorise on its own.
 */
export async function updateOrderStatus(input: unknown): Promise<UpdateStatusResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const profile = await getSessionProfile().catch(() => null);
  if (!profile || !isStaff(profile.role)) {
    return { ok: false, error: "You do not have permission to do that." };
  }

  try {
    await prisma.order.update({
      where: { id: parsed.data.orderId },
      data: { status: parsed.data.status },
    });
  } catch (error) {
    console.error("[updateOrderStatus]", error);
    return { ok: false, error: "Could not update the order. Please try again." };
  }

  // A status change can move an order in or out of the revenue figures
  // (CANCELLED is excluded), so the cached aggregates must go.
  await invalidateAnalyticsCache();
  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

const availabilitySchema = z.object({
  productId: z.string().uuid(),
  isAvailable: z.boolean(),
});

export type ToggleAvailabilityResult =
  | { ok: true; isAvailable: boolean }
  | { ok: false; error: string };

/**
 * Marks a product sold out or back in stock.
 *
 * Availability is enforced server-side at both cart validation and checkout,
 * so this genuinely stops orders rather than merely hiding the card.
 */
export async function setProductAvailability(
  input: unknown,
): Promise<ToggleAvailabilityResult> {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  // Server Actions are public endpoints — authorise here, not just in the UI.
  const profile = await getSessionProfile().catch(() => null);
  if (!profile || !isStaff(profile.role)) {
    return { ok: false, error: "You do not have permission to do that." };
  }

  let updated;
  try {
    updated = await prisma.product.update({
      where: { id: parsed.data.productId },
      data: { isAvailable: parsed.data.isAvailable },
      select: { isAvailable: true },
    });
  } catch (error) {
    console.error("[setProductAvailability]", error);
    return { ok: false, error: "Could not update the product. Please try again." };
  }

  // The menu is cached for 5 minutes INSIDE getMenu(), beneath Next's route
  // cache — revalidatePath alone would leave a sold-out item orderable.
  await invalidateMenuCache();
  await invalidateAnalyticsCache();
  revalidatePath("/menu");
  revalidatePath("/");
  revalidatePath("/admin/dashboard");

  return { ok: true, isAvailable: updated.isAvailable };
}
