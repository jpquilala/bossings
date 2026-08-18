"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getMenuProducts } from "@/server/menu";
import { createClient } from "@/lib/supabase/server";

const PHONE_REGEX = /^(09\d{9}|\+639\d{9})$/;

const lineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable(),
  quantity: z.number().int().min(1).max(99),
});

const checkoutSchema = z
  .object({
    customerName: z.string().trim().min(2, "Please enter your name").max(80),
    phone: z
      .string()
      .trim()
      .regex(PHONE_REGEX, "Enter a valid mobile number, e.g. 09171234567"),
    orderType: z.enum(["DINE_IN", "TAKE_OUT", "ADVANCE_ORDER", "DELIVERY"]),
    paymentMethod: z.enum(["CASH", "GCASH"]),
    address: z.string().trim().max(300).optional().nullable(),
    scheduledFor: z.string().datetime().optional().nullable(),
    notes: z.string().trim().max(300).optional().nullable(),
    items: z.array(lineSchema).min(1, "Your cart is empty").max(50),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === "DELIVERY" && !data.address?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Delivery address is required",
      });
    }
    if (data.orderType === "ADVANCE_ORDER") {
      if (!data.scheduledFor) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledFor"],
          message: "Please choose a date and time",
        });
        return;
      }
      // Reject times in the past — allow a minute of clock skew.
      if (new Date(data.scheduledFor).getTime() < Date.now() - 60_000) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledFor"],
          message: "Please choose a future date and time",
        });
      }
    }
  });

export type CheckoutState = {
  ok: boolean;
  orderNumber?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** BFS-240817-4821 — readable, sortable, and unique enough for a stall. */
function generateOrderNumber(): string {
  const now = new Date();
  const date = [
    String(now.getFullYear()).slice(2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BFS-${date}-${random}`;
}

/**
 * Creates an order. Prices come from the database, never the client, so a
 * tampered payload cannot change what is charged. Guest orders are written
 * here on the server; the browser never gets write access to `orders`.
 */
export async function submitOrder(input: unknown): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  const data = parsed.data;

  // Attach the order to the signed-in user when there is one.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Guest checkout — proceed without a user.
  }

  // Re-price everything from the live menu. If the menu cannot be read we must
  // not guess at prices — fail the order instead.
  let products: Awaited<ReturnType<typeof getMenuProducts>>;
  try {
    products = await getMenuProducts();
  } catch (error) {
    console.error("[submitOrder] menu unavailable", error);
    return {
      ok: false,
      error: "We could not reach our menu just now. Please try again in a moment.",
    };
  }

  const byId = new Map(products.map((product) => [product.id, product]));

  const items: {
    productId: string;
    variantId: string | null;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[] = [];

  for (const line of data.items) {
    const product = byId.get(line.productId);
    if (!product || !product.isAvailable) {
      return {
        ok: false,
        error: "Some items are no longer available. Please review your cart.",
      };
    }

    let unitPrice = product.basePrice;
    let name = product.name;

    if (product.variants.length > 0) {
      const variant =
        product.variants.find((v) => v.id === line.variantId) ??
        product.variants.find((v) => v.isDefault) ??
        product.variants[0];
      unitPrice = variant.price;
      name = `${product.name} (${variant.label})`;
    }

    items.push({
      productId: product.id,
      variantId: product.variants.length > 0 ? line.variantId : null,
      name,
      unitPrice,
      quantity: line.quantity,
      lineTotal: unitPrice * line.quantity,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  // Delivery fee is quoted by staff after the order lands — see the checkout note.
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  // Retry on the (unlikely) order-number collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderNumber = generateOrderNumber();
    try {
      await prisma.order.create({
        data: {
          userId,
          orderNumber,
          orderType: data.orderType,
          status: "PENDING",
          customerName: data.customerName,
          phone: data.phone,
          address: data.orderType === "DELIVERY" ? (data.address ?? null) : null,
          scheduledFor:
            data.orderType === "ADVANCE_ORDER" && data.scheduledFor
              ? new Date(data.scheduledFor)
              : null,
          paymentMethod: data.paymentMethod,
          notes: data.notes || null,
          subtotal,
          deliveryFee,
          total,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            })),
          },
        },
      });

      // Save the phone for next time so checkout prefills it.
      if (userId) {
        await prisma.profile
          .update({ where: { id: userId }, data: { phone: data.phone } })
          .catch(() => null);
      }

      revalidatePath("/admin");
      revalidatePath("/account/orders");

      return { ok: true, orderNumber };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") continue; // duplicate orderNumber — try again
      console.error("[submitOrder]", error);
      return {
        ok: false,
        error: "We could not save your order. Please try again.",
      };
    }
  }

  return { ok: false, error: "We could not save your order. Please try again." };
}
