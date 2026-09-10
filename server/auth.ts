/* אימות סיסמה מול רשימת המשתמשות שבמשתנה הסביבה ADMIN_USERS.
 *
 * הסיסמאות לא נשמרות בשום מקום - רק גיבוב (PBKDF2) עם salt לכל משתמשת.
 * יצירת גיבוב: node scripts/hash-password.mjs */
import { verifyPassword, hashPassword } from "./crypto";
import { requireEnv, type Env } from "./env";

export type AdminUser = { username: string; name: string; hash: string };

export function loadUsers(env: Env): AdminUser[] {
  const parsed = JSON.parse(requireEnv(env, "ADMIN_USERS")) as unknown;
  /* ממשק הסודות של קלאודפלייר מוריד סוגריים מרובעים כשמדביקים קובץ .env,
     ואז מגיעה לכאן משתמשת בודדת ולא מערך. מקבלים את שתי הצורות. */
  const list = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? [parsed] : null;
  if (!list) throw new Error("ADMIN_USERS חייב להיות מערך JSON");
  return list as AdminUser[];
}

/** מחזיר את המשתמשת אם שם המשתמש והסיסמה נכונים, אחרת null.
 *  בודק תמיד סיסמה (גם כששם המשתמש לא קיים) כדי לא לחשוף בזמן התגובה
 *  אילו שמות משתמש קיימים. */
export async function authenticate(env: Env, username: string, password: string): Promise<AdminUser | null> {
  const users = loadUsers(env);
  const user = users.find((u) => u.username === username.trim().toLowerCase());
  if (!user) {
    await hashPassword(password); // עבודה שקולה, כדי שהזמן לא יסגיר
    return null;
  }
  return (await verifyPassword(password, user.hash)) ? user : null;
}
