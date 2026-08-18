/**
 * Next.js instrumentation hook — runs once per server process, before any
 * request is handled.
 */
export async function register() {
  // Server runtime only; the Edge runtime has no `process` event emitter.
  // The Node-only code lives in a separate module that is imported lazily, so
  // the Edge bundle never even parses it.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { registerProcessGuards } = await import("./instrumentation.node");
  registerProcessGuards();
}

/** Reports errors raised while rendering a request. */
export async function onRequestError(
  error: unknown,
  request: { path: string },
  context: { routerKind: string; routeType: string },
) {
  const { captureException } = await import("@/lib/monitoring");
  captureException(error, {
    path: request.path,
    routerKind: context.routerKind,
    routeType: context.routeType,
  });
}
