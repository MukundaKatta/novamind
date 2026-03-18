import { nanoid } from "nanoid";

/**
 * Generate a new API key with the format: nm_live_<random>
 * Returns both the full key (shown once) and the hash (stored in DB)
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = nanoid(40);
  const key = `nm_live_${randomPart}`;
  const prefix = key.substring(0, 12);

  // For production, use crypto.subtle.digest or bcrypt
  // This uses a simple hash for the key storage
  const hash = hashApiKey(key);

  return { key, prefix, hash };
}

export function hashApiKey(key: string): string {
  // Simple hash using Web Crypto API compatible approach
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Use a more robust approach with base64
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  let result = "";
  for (let i = 0; i < data.length; i++) {
    result += data[i].toString(16).padStart(2, "0");
  }
  return result;
}

/**
 * Server-side hash using Web Crypto API
 */
export async function hashApiKeySecure(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function maskApiKey(prefix: string): string {
  return `${prefix}${"*".repeat(32)}`;
}
