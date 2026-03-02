import { getUiConfig } from "./config";

export function getTurnstileSiteKey(): string {
  return getUiConfig().auth.turnstileSiteKey;
}

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }
  return token.length > 0;
}
