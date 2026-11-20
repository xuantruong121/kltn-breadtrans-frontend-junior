import assert from "node:assert/strict";
import test from "node:test";

import { socketBaseUrl, SOCKET_TRANSPORTS } from "./socketUrl.ts";

test("sockets use their own address behind the /api proxy, else the API's", () => {
  assert.equal(socketBaseUrl({ socket: "https://api.breadtrans.edu.vn/", api: "/api" }), "https://api.breadtrans.edu.vn");
  assert.equal(socketBaseUrl({ api: "http://localhost:3001" }), "http://localhost:3001");
  assert.equal(socketBaseUrl({ api: "https://x.vn/api" }), "https://x.vn");
  // A relative API base cannot carry a socket: the local default.
  assert.equal(socketBaseUrl({ api: "/api" }), "http://localhost:3001");
});

test("sockets try WebSocket first and fall back to long-polling", () => {
  assert.deepEqual(SOCKET_TRANSPORTS.transports, ["websocket", "polling"]);
  assert.equal(SOCKET_TRANSPORTS.tryAllTransports, true);
});
