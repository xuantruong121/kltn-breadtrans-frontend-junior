/**
 * The full-page Google sign-in (server OAuth redirect, then /auth/callback).
 * Used when Google's own button cannot load or does not answer: it needs no
 * third-party iframe and no popup, so extensions and blocked popups do not
 * stop it.
 */
export function googleRedirectUrl(apiBase: string): string {
  return `${apiBase.replace(/\/+$/, "")}/auth/google`;
}
