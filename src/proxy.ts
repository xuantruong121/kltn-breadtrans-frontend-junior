import { NextResponse, type NextRequest } from "next/server";

import { buildCsp } from "@/lib/security/csp";
import { socketBaseUrl } from "@/lib/realtime/socketUrl";

/**
 * A fresh CSP nonce for every page request (owner 2026-11-14). Next.js reads
 * the nonce from the request's Content-Security-Policy header and puts it on
 * its own scripts; the root layout reads x-nonce for the inline ones.
 * CSP_MODE=report-only only reports, for a quick way back if a page breaks.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp({
    nonce,
    dev: process.env.NODE_ENV !== "production",
    apiOrigin: process.env.NEXT_PUBLIC_API_URL,
    socketOrigin: socketBaseUrl(),
  });
  const headerName =
    process.env.CSP_MODE === "report-only" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(headerName, csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not the API proxy, static files or prefetches.
      source: "/((?!api|_next/static|_next/image|favicon.ico|icons/|images/|sounds/|.*\\.(?:png|jpg|jpeg|svg|webp|mp3|wav|ico|json|txt|xml)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
