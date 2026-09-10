/* POST /api/asset  { name, contentType, base64 }
 *   -> { path: "/images/<file>" }
 *
 * מעלה תמונה (או סרטון) לריפו כ-commit, ומחזיר את הנתיב הציבורי שנשמר
 * בקובץ התוכן. הדחיסה של תמונות נעשית בדפדפן לפני השליחה.
 *
 * זו הנקודה היחידה בפאנל שמקבלת קובץ מבחוץ, ולכן האימות כאן הדוק:
 * סוג מותר (בלי SVG - יכול לשאת סקריפט), גודל מוגבל, ושם קובץ שנבנה
 * מחדש ולא מתקבל כמו שהוא. */
import type { Env } from "../../server/env";
import { error, json, readJson } from "../../server/http";
import { getSession } from "../../server/session";
import { GitHubError, writeBinaryFile } from "../../server/github";

const ALLOWED: Record<string, { extension: string; dir: string; maxBytes: number }> = {
  "image/jpeg": { extension: "jpg", dir: "images", maxBytes: 4 * 1024 * 1024 },
  "image/png": { extension: "png", dir: "images", maxBytes: 4 * 1024 * 1024 },
  "image/webp": { extension: "webp", dir: "images", maxBytes: 4 * 1024 * 1024 },
  /* Cloudflare Pages לא מגישה קובץ סטטי מעל 25MiB. 20MB משאיר מרווח. */
  "video/mp4": { extension: "mp4", dir: "video", maxBytes: 20 * 1024 * 1024 },
  "video/webm": { extension: "webm", dir: "video", maxBytes: 20 * 1024 * 1024 },
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getSession(env, request);
  if (!session) return error(401, "לא מחוברת");

  let body: { name?: unknown; contentType?: unknown; base64?: unknown };
  try {
    body = await readJson(request);
  } catch {
    return error(400, "בקשה לא תקינה");
  }

  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const base64 = typeof body.base64 === "string" ? body.base64 : "";
  const rawName = typeof body.name === "string" ? body.name : "";

  const kind = ALLOWED[contentType];
  if (!kind) return error(400, "אפשר להעלות תמונות JPG, PNG, WebP או סרטוני MP4, WebM בלבד");
  if (!base64) return error(400, "לא הגיע קובץ");
  const { extension, dir, maxBytes } = kind;
  const isVideo = contentType.startsWith("video/");

  const bytes = Math.floor((base64.replace(/=+$/, "").length * 3) / 4);
  if (bytes > maxBytes) {
    const what = isVideo ? "הסרטון" : "התמונה";
    return error(413, `${what} גדול מדי (${Math.round(bytes / 1024 / 1024)}MB). המקסימום הוא ${Math.round(maxBytes / 1024 / 1024)}MB.`);
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return error(400, "הקובץ לא הגיע בפורמט תקין");

  const slug =
    rawName
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || (isVideo ? "video" : "image");
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const filename = `${slug}-${unique}.${extension}`;

  try {
    const author = { name: session.name, email: `${session.username}@or-vehomer-admin.local` };
    const label = isVideo ? "סרטון" : "תמונה";
    await writeBinaryFile(env, `${dir}/${filename}`, base64, `[פאנל] העלאת ${label}: ${filename}`, author);
    return json(200, { path: `/${dir}/${filename}` });
  } catch (e) {
    if (e instanceof GitHubError) return error(e.status, e.message);
    console.error(e);
    return error(500, "שגיאה בשרת");
  }
};
