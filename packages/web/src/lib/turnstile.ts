export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }
  return token.length > 0;
}
