/**
 * Error monitoring hook.
 *
 * Dependency-free and Sentry-compatible. When `SENTRY_DSN` is configured, events
 * are forwarded to Sentry's envelope endpoint; otherwise this module is a quiet
 * no-op that only writes a structured line to the server console. It never
 * pretends to report to a provider that has not been set up, and it never throws
 * into the caller — observability must not break the request.
 */

/** Structured context attached to a captured error. */
export interface ErrorContext {
  /** Where the error happened, e.g. "server-action", "route-handler". */
  source?: string;
  /** Route file path, e.g. "/app/campaigns/[id]/page". */
  routePath?: string;
  /** "render" | "route" | "action" | "proxy". */
  routeType?: string;
  /** Request path, e.g. "/dashboard?tab=wallet". */
  path?: string;
  /** HTTP method. */
  method?: string;
  /** React error digest (identifies the original error type). */
  digest?: string;
  /** Arbitrary extra attributes. */
  [key: string]: unknown;
}

/** Whether a Sentry DSN is present, i.e. events will be forwarded. */
export function isMonitoringConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

interface ParsedDsn {
  publicKey: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+/, "");
    const publicKey = url.username;
    if (!publicKey || !projectId) return null;
    return { publicKey, host: `${url.protocol}//${url.host}`, projectId };
  } catch {
    return null;
  }
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function toStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

/**
 * Capture an error for observability. Safe to `await` from server code.
 * Always resolves; never rejects.
 */
export async function captureError(
  error: unknown,
  context: ErrorContext = {}
): Promise<void> {
  const message = toMessage(error);

  // Always leave a local structured trace — useful even without a provider.
  try {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        ...context,
        timestamp: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore console failures (e.g. circular refs already serialized above).
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // No provider configured → local trace only.

  const parsed = parseDsn(dsn);
  if (!parsed) {
    console.error("[monitoring] SENTRY_DSN is set but malformed; skipping forward.");
    return;
  }

  try {
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const sentAt = new Date().toISOString();

    const header = {
      event_id: eventId,
      dsn,
      sent_at: sentAt,
    };
    const item = { type: "event", content_type: "application/json" };
    const payload = {
      event_id: eventId,
      timestamp: sentAt,
      platform: "javascript",
      level: "error",
      environment: process.env.NODE_ENV,
      message,
      exception: {
        values: [
          {
            type: error instanceof Error ? error.name : "Error",
            value: message,
            stacktrace: toStack(error)
              ? { frames: [] } // frames intentionally omitted (no source maps here)
              : undefined,
          },
        ],
      },
      tags: {
        source: typeof context.source === "string" ? context.source : undefined,
        route_type:
          typeof context.routeType === "string" ? context.routeType : undefined,
      },
      request: context.path
        ? { url: context.path, method: context.method }
        : undefined,
      extra: context,
    };

    const body = `${JSON.stringify(header)}\n${JSON.stringify(item)}\n${JSON.stringify(payload)}\n`;
    const endpoint = `${parsed.host}/api/${parsed.projectId}/envelope/`;

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": [
          "Sentry",
          "sentry_version=7",
          `sentry_client=clipsetu/1.0`,
          `sentry_key=${parsed.publicKey}`,
        ].join(" "),
      },
      body,
    });
  } catch {
    // Reporting failed — the local trace above already recorded the error.
  }
}
