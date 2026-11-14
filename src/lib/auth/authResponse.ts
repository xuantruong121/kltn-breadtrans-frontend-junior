/** A sign-in answer: the access token and the user; the refresh token is an HttpOnly cookie. */
export interface NormalizedAuthResponse {
  access_token: string;
  user: { id: number; email: string; role: string; profile?: unknown };
}

export function normalizeAuthResponse(input: unknown): NormalizedAuthResponse {
  const value = (input as { data?: unknown })?.data ?? input;
  const response = value as Partial<NormalizedAuthResponse>;
  if (!response?.access_token || !response.user) {
    throw new Error("Phản hồi đăng nhập không hợp lệ.");
  }
  return response as NormalizedAuthResponse;
}
