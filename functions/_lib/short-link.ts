export const MAX_CODE_LENGTH = 100_000;
export const LINK_TTL_SECONDS = 60 * 60 * 24 * 90;
export const SHORT_ID_PATTERN = /^[A-Za-z0-9_-]{10,43}$/;

// Prefix lengths tried in order; the last is the full SHA-256 (43 base64url chars).
const ID_LENGTHS = [10, 16, 43];

export interface ShortLinkStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

/**
 * Store `code` under an ID derived from its content, so the same diagram always
 * maps to the same ID. A longer prefix is used if a shorter one is taken by a
 * different diagram. Every call (re)starts the link's TTL.
 */
export async function createShortLink(store: ShortLinkStore, code: string): Promise<string> {
  const hash = await hashCode(code);
  for (const length of ID_LENGTHS) {
    const id = hash.slice(0, length);
    const existing = await store.get(id);
    if (existing === code || existing === null) {
      await store.put(id, code, { expirationTtl: LINK_TTL_SECONDS });
      return id;
    }
  }
  throw new Error("SHA-256 collision");
}
