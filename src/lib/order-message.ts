import { formatPeso } from "./currency";
import { STORE } from "./store";
import { ORDER_TYPE_LABEL, PAYMENT_METHOD_LABEL, type OrderType, type PaymentMethod } from "@/types/order";

type MessageInput = {
  orderNumber: string;
  customerName: string;
  phone: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  address?: string | null;
  scheduledFor?: string | Date | null;
  notes?: string | null;
  items: { name: string; quantity: number; lineTotal: number }[];
  total: number;
};

/** Plain-text order summary sent over SMS or Messenger. */
export function buildOrderMessage(input: MessageInput): string {
  const lines = [
    `Hi Bossing! Order #${input.orderNumber}`,
    "",
    ...input.items.map(
      (item) => `${item.quantity}x ${item.name} - ${formatPeso(item.lineTotal)}`,
    ),
    "",
    `Total: ${formatPeso(input.total)}`,
    `Type: ${ORDER_TYPE_LABEL[input.orderType]}`,
    `Payment: ${PAYMENT_METHOD_LABEL[input.paymentMethod]}`,
    `Name: ${input.customerName}`,
    `Mobile: ${input.phone}`,
  ];

  if (input.orderType === "DELIVERY" && input.address) {
    lines.push(`Address: ${input.address}`);
  }

  if (input.orderType === "ADVANCE_ORDER" && input.scheduledFor) {
    const when = new Date(input.scheduledFor);
    lines.push(
      `Schedule: ${when.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })}`,
    );
  }

  if (input.notes) lines.push(`Notes: ${input.notes}`);

  // Restate the GCash details in the message itself: the customer often sends
  // this from their phone and then switches straight to the GCash app, so the
  // number needs to travel with the order rather than stay on the web page.
  if (input.paymentMethod === "GCASH") {
    lines.push("", `GCash: ${STORE.gcashDisplay} (${formatPeso(input.total)})`);
  }

  return lines.join("\n");
}

/** `sms:` link with the body prefilled. Uses the `?` separator for broad support. */
export function buildSmsLink(message: string): string {
  return `sms:+63${STORE.phoneDigits.slice(1)}?body=${encodeURIComponent(message)}`;
}

/** Messenger cannot prefill text, so we open the thread and copy the message. */
export function buildMessengerLink(): string {
  return STORE.messengerUrl;
}
