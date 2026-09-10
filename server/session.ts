/* עוגיית התחברות חתומה (HMAC-SHA256) - בלי מסד נתונים ובלי ספריות.
 *
 * מבנה: base64url(payload).base64url(signature)
 * payload = { u: username, n: שם לתצוגה, exp: תפוגה }
 * העוגייה HttpOnly, SameSite=Lax, ובפרודקשן גם Secure. */
import { b64urlDecodeText, b64urlEncode, hmacSign, timingSafeEqual } from "./crypto";
import { isLocal, requireEnv, type Env } from "./env";

export const COOKIE_NAME = "ov_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // שבוע
/** "זכור אותי" - חצי שנה, כדי שהלקוחה לא תתחבר מחדש בכל עריכה */
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const encoder = new TextEncoder();

export const maxAge = (remember: boolean) => (remember ? REMEMBER_MAX_AGE_SECONDS : MAX_AGE_SECONDS);

export type Session = { username: string; name: string; exp: number };

/** תפוגת הטוקן והעוגייה חייבות להיות זהות - אחרת העוגייה תישלח אחרי
 *  שהטוקן שבתוכה כבר פג, וזה נראה כמו התנתקות מקרית. */
export async function createToken(env: Env, session: Omit<Session, "exp">, remember = false): Promise<string> {
  const payload = b64urlEncode(
    JSON.stringify({ u: session.username, n: session.name, exp: Date.now() + maxAge(remember) * 1000 }),
  );
  return `${payload}.${await hmacSign(requireEnv(env, "SESSION_SECRET"), payload)}`;
}

export async function verifyToken(env: Env, token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = await hmacSign(requireEnv(env, "SESSION_SECRET"), payload);
  if (!timingSafeEqual(encoder.encode(signature), encoder.encode(expected))) return null;

  try {
    const data = JSON.parse(b64urlDecodeText(payload));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (typeof data.u !== "string" || typeof data.n !== "string") return null;
    return { username: data.u, name: data.n, exp: data.exp };
  } catch {
    return null;
  }
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function getSession(env: Env, request: Request): Promise<Session | null> {
  return verifyToken(env, parseCookies(request.headers.get("Cookie"))[COOKIE_NAME]);
}

function cookieAttributes(env: Env, maxAge: number): string {
  const secure = isLocal(env) ? "" : "; Secure";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function sessionCookie(env: Env, token: string, remember = false): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttributes(env, maxAge(remember))}`;
}

export function clearedCookie(env: Env): string {
  return `${COOKIE_NAME}=; ${cookieAttributes(env, 0)}`;
}
