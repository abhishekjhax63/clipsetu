import type { Instrumentation } from "next";
import { captureError } from "@/lib/monitoring";

/**
 * Next.js instrumentation entrypoint (runs once per server instance).
 * `register` is reserved for tracing/OTel wiring and is a no-op by default;
 * `onRequestError` forwards every unhandled server error to the monitoring hook.
 */
export function register() {
  // Intentionally empty. Add OpenTelemetry / Sentry tracing init here when a
  // provider is configured.
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String((err as { digest?: unknown }).digest)
      : undefined;

  await captureError(err, {
    source: "request",
    routePath: context.routePath,
    routeType: context.routeType,
    path: request.path,
    method: request.method,
    digest,
    routerKind: context.routerKind,
  });
};
