/* משתני הסביבה שהשרת צריך.
 *
 * ב-Cloudflare הם מגיעים כארגומנט לפונקציה (context.env) ולא דרך
 * process.env - ולכן כל פונקציה מקבלת אותם ומעבירה הלאה. */

export type Env = {
  /** סוד לחתימת עוגיית ההתחברות. מחרוזת אקראית ארוכה (32+ תווים) */
  SESSION_SECRET: string;
  /** רשימת המשתמשות כ-JSON: [{"username","name","hash"}] - ראו scripts/hash-password.mjs */
  ADMIN_USERS: string;
  /** טוקן GitHub עם הרשאת contents: read/write על הריפו הזה בלבד */
  GITHUB_TOKEN: string;
  /** "owner/repo", למשל osnat6130-ctrl/or-vehomer */
  GITHUB_REPO: string;
  /** הענף שאליו הפאנל כותב. ברירת מחדל main */
  GITHUB_BRANCH?: string;
  /** מוגדר רק בפיתוח מקומי - העוגייה לא תסומן Secure */
  LOCAL_DEV?: string;
};

export function requireEnv(env: Env, name: keyof Env): string {
  const value = env[name];
  if (!value) throw new Error(`חסר משתנה סביבה: ${name}`);
  return value;
}

export const isLocal = (env: Env) => env.LOCAL_DEV === "1";
export const branch = (env: Env) => env.GITHUB_BRANCH || "main";
