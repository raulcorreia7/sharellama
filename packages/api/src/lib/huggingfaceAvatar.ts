export const HF_AVATAR_PLACEHOLDER =
  "https://huggingface.co/front/assets/huggingface_logo-noborder.svg";

const AVATAR_JSON_REGEX =
  /avatarUrl&quot;:&quot;(https:\/\/cdn-avatars\.huggingface\.co[^"&]+)&quot;/i;
const META_IMAGE_REGEXES = [
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
  /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
];

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x2F;", "/")
    .replaceAll("&#47;", "/");
}

function normalizeUrl(value: string): string | null {
  const decoded = decodeHtmlEntities(value.trim());

  if (!decoded) {
    return null;
  }
  if (decoded.startsWith("//")) {
    return `https:${decoded}`;
  }
  if (decoded.startsWith("/")) {
    return `https://huggingface.co${decoded}`;
  }
  if (!/^https?:\/\//i.test(decoded)) {
    return null;
  }
  return decoded;
}

export function extractAvatarFromHfHtml(html: string): string | undefined {
  const avatarMatch = html.match(AVATAR_JSON_REGEX);
  if (avatarMatch?.[1]) {
    return normalizeUrl(avatarMatch[1]) ?? undefined;
  }

  for (const regex of META_IMAGE_REGEXES) {
    const match = html.match(regex);
    if (match?.[1]) {
      const normalized = normalizeUrl(match[1]);
      if (normalized) {
        return normalized;
      }
    }
  }

  return undefined;
}

