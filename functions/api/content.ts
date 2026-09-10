/* GET /api/content  -> התוכן העדכני מהריפו + sha
 * PUT /api/content  -> שמירה: אימות, commit, sha חדש
 *
 * הקריאה היא מהריפו (ולא מהבנייה) כדי שהפאנל תמיד יערוך את הגרסה
 * האחרונה שנשמרה, גם אם Cloudflare עדיין באמצע פרסום. */
import type { Env } from "../../server/env";
import { error, json, readJson } from "../../server/http";
import { getSession } from "../../server/session";
import { GitHubError, readFile, writeFile } from "../../server/github";
import { savePayloadSchema } from "../../server/schema";

export const CONTENT_FILE = "content/site.json";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getSession(env, request);
  if (!session) return error(401, "לא מחוברת");
  try {
    const site = await readFile(env, CONTENT_FILE);
    return json(200, { site: JSON.parse(site.text), shas: { site: site.sha } });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getSession(env, request);
  if (!session) return error(401, "לא מחוברת");

  try {
    // zod משמש לאימות בלבד. כותבים את האובייקט המקורי ולא את parsed.data,
    // כי zod בונה אובייקט חדש ומשנה את סדר המפתחות - וזה היה הופך שינוי
    // של שורה אחת ל-diff של כל הקובץ.
    const raw = await readJson<Record<string, unknown>>(request);
    const parsed = savePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return error(400, `תוכן לא תקין: ${issue.path.join(".")} - ${issue.message}`);
    }
    const { message, shas } = parsed.data;
    const site = raw.site;

    const author = { name: session.name, email: `${session.username}@or-vehomer-admin.local` };
    const out = await writeFile(env, CONTENT_FILE, JSON.stringify(site, null, 2) + "\n", shas.site, `[פאנל] ${message}`, author);
    return json(200, { ok: true, saved: { site: { sha: out.sha, commitUrl: out.commitUrl } }, by: session.name });
  } catch (e) {
    return toErrorResponse(e);
  }
};

function toErrorResponse(e: unknown): Response {
  if (e instanceof GitHubError) return error(e.status, e.message);
  console.error(e);
  return error(500, "שגיאה בשרת");
}
