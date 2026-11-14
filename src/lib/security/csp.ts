/**
 * Content Security Policy of the web app (owner 2026-11-14). Scripts run only
 * with this request's nonce ('strict-dynamic' lets them load their chunks),
 * so an injected <script> or inline handler does not run. Styles keep
 * 'unsafe-inline' because React style attributes and motion need it.
 */
export type CspOptions = {
  nonce: string;
  dev: boolean;
  /** Absolute API origin when the browser calls it directly (not via /api). */
  apiOrigin?: string | null;
  /** Origin the sockets connect to. */
  socketOrigin?: string | null;
};

const originOf = (url?: string | null): string | null => {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const wsOf = (origin: string | null) => (origin ? origin.replace(/^http/, "ws") : null);

export function buildCsp(o: CspOptions): string {
  const api = originOf(o.apiOrigin);
  const socket = originOf(o.socketOrigin);
  const google = "https://accounts.google.com";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${o.nonce}'`,
      "'strict-dynamic'",
      `${google}/gsi/client`,
      // React Refresh evaluates code in development only.
      ...(o.dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", `${google}/gsi/style`],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    // Learning media (R2), QR codes, avatars: any https image or recording.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "data:", "blob:", "https:"],
    "connect-src": [
      "'self'",
      ...[api, socket, wsOf(socket), wsOf(api)].filter((x): x is string => !!x),
      google,
      "https://*.r2.dev",
      ...(o.dev ? ["ws:", "http://localhost:*", "http://127.0.0.1:*"] : []),
    ],
    "frame-src": [google, "https://www.youtube-nocookie.com"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${[...new Set(v)].join(" ")}`);
  if (!o.dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}
