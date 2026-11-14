/** Seconds of life left in a JWT, or 0 when it is missing or cannot be read. */
export function secondsLeft(token: string | null | undefined, now = Date.now()): number {
  if (!token) return 0;
  try {
    const part = token.split(".")[1] ?? "";
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? Math.max(0, json.exp - Math.floor(now / 1000)) : 0;
  } catch {
    return 0;
  }
}

/** Renew before a request when less than this is left, so no request is sent only to be refused. */
export const RENEW_BEFORE_SECONDS = 20;
