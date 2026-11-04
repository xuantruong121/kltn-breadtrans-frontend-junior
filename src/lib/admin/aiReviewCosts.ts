/** Mirrors GET /admin/system-costs/ai-review (backend provider-pricing.ts). */
export type AiReviewModelRow = {
  provider: string;
  model: string;
  label: string | null;
  requests: number;
  ok: number;
  invalid: number;
  unavailable: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number | null;
  neurons: number | null;
  tokensMissing: boolean;
};

export type AiReviewCosts = {
  generatedAt: string;
  days: number;
  telemetryAvailable: boolean;
  cloudflareFreeNeuronsPerDay: number;
  models: AiReviewModelRow[];
  perDay: Array<{
    day: string;
    requests: number;
    cloudflareNeurons: number;
    cloudflareOverFreeUsd: number;
  }>;
  spent: Array<{ provider: string; until: string | null }>;
};

export const PROVIDER_NAMES: Record<string, string> = {
  cloudflare: "Cloudflare Workers AI",
  "openai-compatible": "Groq (OpenAI-compatible)",
  gemini: "Google Gemini",
};

export function formatTokens(value: number): string {
  return value.toLocaleString("vi-VN");
}

/** "$0.0616", "—" when there is no figure, "<$0.0001" for tiny amounts. */
export function formatUsd(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "$0";
  if (value < 0.0001) return "<$0.0001";
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
}

/** Share of answers the provider gave that passed, or null with none. */
export function okShare(row: Pick<AiReviewModelRow, "requests" | "ok">): number | null {
  return row.requests > 0 ? row.ok / row.requests : null;
}

/** Average latency per call in seconds, one decimal. */
export function averageSeconds(row: Pick<AiReviewModelRow, "requests" | "latencyMs">): string {
  if (row.requests === 0) return "—";
  return `${(row.latencyMs / row.requests / 1000).toFixed(1)} s`;
}
