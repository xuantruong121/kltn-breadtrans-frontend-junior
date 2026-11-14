import assert from "node:assert/strict";
import test from "node:test";

import { buildCsp } from "./csp.ts";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

test("scripts run only with the nonce, and nothing may frame the app", () => {
  const csp = buildCsp({ nonce: "abc", dev: false, apiOrigin: "/api", socketOrigin: "https://api.breadtrans.edu.vn" });
  assert.match(directive(csp, "script-src"), /'nonce-abc' 'strict-dynamic'/);
  assert.doesNotMatch(directive(csp, "script-src"), /unsafe-inline|unsafe-eval/);
  assert.equal(directive(csp, "object-src"), "object-src 'none'");
  assert.equal(directive(csp, "frame-ancestors"), "frame-ancestors 'none'");
  assert.match(csp, /upgrade-insecure-requests/);
});

test("the sockets and a direct API origin may be reached", () => {
  const csp = buildCsp({
    nonce: "n",
    dev: false,
    apiOrigin: "https://api.breadtrans.edu.vn",
    socketOrigin: "https://api.breadtrans.edu.vn/",
  });
  const connect = directive(csp, "connect-src");
  assert.match(connect, /https:\/\/api\.breadtrans\.edu\.vn/);
  assert.match(connect, /wss:\/\/api\.breadtrans\.edu\.vn/);
  assert.match(connect, /https:\/\/accounts\.google\.com/);
});

test("development allows React Refresh and the local servers", () => {
  const csp = buildCsp({ nonce: "n", dev: true, apiOrigin: "http://localhost:3001", socketOrigin: null });
  assert.match(directive(csp, "script-src"), /'unsafe-eval'/);
  assert.match(directive(csp, "connect-src"), /ws:/);
  assert.match(directive(csp, "connect-src"), /ws:\/\/localhost:3001/);
  assert.doesNotMatch(csp, /upgrade-insecure-requests/);
});
