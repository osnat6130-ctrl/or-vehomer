/* GET /api/history          -> רשימת הגרסאות של התוכן, מהחדשה לישנה
 * GET /api/history?sha=<sha> -> התוכן כפי שהיה באותה גרסה
 *
 * ההיסטוריה היא היסטוריית ה-git של content/ - אין טבלה ואין מסד נתונים. */
import type { Env } from "../../server/env";
import { error, json } from "../../server/http";
import { getSession } from "../../server/session";
import { GitHubError, listContentCommits, readFileAtRef } from "../../server/github";

const CONTENT_DIR = "content";
const CONTENT_FILE = "content/site.json";
const DEFAULT_LIMIT = 40;
const SHA_PATTERN = /^[0-9a-f]{7,40}$/;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getSession(env, request);
  if (!session) return error(401, "לא מחוברת");

  const url = new URL(request.url);
  const sha = url.searchParams.get("sha");

  try {
    if (sha !== null) {
      if (!SHA_PATTERN.test(sha)) return error(400, "מזהה גרסה לא תקין");
      const site = await readFileAtRef(env, CONTENT_FILE, sha);
      if (site === null) return error(404, "הגרסה לא נמצאה");
      return json(200, { sha, site: safeParse(site) });
    }

    const limitParam = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : DEFAULT_LIMIT;
    const commits = await listContentCommits(env, CONTENT_DIR, limit);
    return json(200, { commits });
  } catch (e) {
    if (e instanceof GitHubError) return error(e.status, e.message);
    console.error(e);
    return error(500, "שגיאה בשרת");
  }
};

/** קובץ תוכן פגום בגרסה ישנה לא צריך להפיל את כל המסך */
function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
