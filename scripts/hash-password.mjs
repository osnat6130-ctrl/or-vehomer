/* יוצר גיבוב (hash) לסיסמה של משתמשת בפאנל הניהול.
 *
 * שימוש:
 *   node scripts/hash-password.mjs <שם-משתמש> "<שם לתצוגה>"
 * הסיסמה מוקלדת בטרמינל (לא נשמרת בהיסטוריה של הפקודות).
 * הפלט הוא רשומת JSON להדבקה במשתנה הסביבה ADMIN_USERS ב-Cloudflare:
 *   ADMIN_USERS=[{...רשומה 1...},{...רשומה 2...}]
 *
 * האלגוריתם (PBKDF2-SHA256 דרך Web Crypto) זהה בדיוק לזה שבשרת -
 * ראו server/crypto.ts. */
import { createInterface } from "node:readline";

const ITERATIONS = 25_000;
const KEY_BYTES = 32;

const [, , username, name] = process.argv;
if (!username || !name) {
  console.error('שימוש: node scripts/hash-password.mjs <שם-משתמש> "<שם לתצוגה>"');
  process.exit(1);
}

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question("סיסמה: ", async (password) => {
  rl.close();
  if (password.length < 12) {
    console.error("הסיסמה חייבת להיות לפחות 12 תווים - זו ההגנה העיקרית כאן");
    process.exit(1);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.normalize("NFKC")), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, key, KEY_BYTES * 8);
  const record = {
    username: username.trim().toLowerCase(),
    name,
    hash: `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(new Uint8Array(bits))}`,
  };
  console.log("\nרשומה ל-ADMIN_USERS:\n");
  console.log(JSON.stringify(record));
});
