/* עזרי הצפנה על Web Crypto בלבד.
 *
 * למה לא node:crypto? הקוד רץ ב-Cloudflare Workers, שבו אין scryptSync
 * ואין Buffer. Web Crypto קיים גם שם, גם ב-Node וגם בדפדפן - ולכן זו
 * השכבה היחידה שצריך. */

const encoder = new TextEncoder();

/* ---------- base64url ---------- */

export function b64urlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(input: string): Uint8Array {
  const binary = atob(input.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function b64urlDecodeText(input: string): string {
  return new TextDecoder().decode(b64urlDecode(input));
}

/* ---------- hex ---------- */

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/* ---------- השוואה בזמן קבוע ---------- */

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ---------- גיבוב סיסמאות (PBKDF2-SHA256) ---------- */

/* 25,000 סיבובים: מספיק כדי להאט ניחוש, ובתוך תקציב ה-CPU של Workers
 * במסלול החינמי. ההגנה האמיתית היא סיסמה אקראית וארוכה. */
export const PBKDF2_ITERATIONS = 25_000;
const KEY_BYTES = 32;

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password.normalize("NFKC")), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** פורמט: pbkdf2$<iterations>$<salt-hex>$<key-hex> */
export async function hashPassword(password: string, salt?: Uint8Array): Promise<string> {
  const saltBytes = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(password, saltBytes, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(saltBytes)}$${toHex(key)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, iterations, saltHex, keyHex] = stored.split("$");
  if (algo !== "pbkdf2" || !iterations || !saltHex || !keyHex) return false;
  const expected = fromHex(keyHex);
  const actual = await derive(password, fromHex(saltHex), Number(iterations));
  return timingSafeEqual(actual, expected);
}

/* ---------- חתימת HMAC ---------- */

export async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return b64urlEncode(new Uint8Array(signature));
}
