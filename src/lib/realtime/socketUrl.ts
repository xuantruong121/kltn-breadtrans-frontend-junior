/**
 * Where the sockets connect. Behind the Next.js proxy the API base is "/api"
 * on the web app's own domain, which cannot carry WebSockets; the sockets
 * then need the API's own address (NEXT_PUBLIC_SOCKET_URL). They sign in
 * with the access token, never with the cookie.
 */
export function socketBaseUrl(
  env: { socket?: string; api?: string } = {
    socket: process.env.NEXT_PUBLIC_SOCKET_URL,
    api: process.env.NEXT_PUBLIC_API_URL,
  },
): string {
  if (env.socket) return env.socket.replace(/\/$/, "");
  if (env.api && /^https?:\/\//.test(env.api)) return env.api.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return "http://localhost:3001";
}

/**
 * How every socket connects: WebSocket first, HTTP long-polling when a network
 * blocks WebSocket (some company proxies and public Wi-Fi). socket.io-client
 * 4.8 only moves on to the next transport with `tryAllTransports`.
 */
export const SOCKET_TRANSPORTS = {
  transports: ["websocket", "polling"],
  tryAllTransports: true,
} satisfies { transports: string[]; tryAllTransports: boolean };
