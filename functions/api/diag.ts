/* בדיקה זמנית: מדווחת אם הסודות הוגדרו ובאיזה מבנה - בלי לחשוף ערכים.
 * למחוק אחרי האימות. */
import type { Env } from "../../server/env";

export const onRequestGet: PagesFunction<Env> = ({ env }) => {
  const e = env as unknown as Record<string, unknown>;
  const info: Record<string, unknown> = {};

  for (const key of ["SESSION_SECRET", "GITHUB_TOKEN", "GITHUB_REPO", "GITHUB_BRANCH", "ADMIN_USERS"]) {
    const v = e[key];
    info[key] = typeof v === "string" ? { len: v.length, head: v.slice(0, 4) } : { missing: true, type: typeof v };
  }

  const raw = e.ADMIN_USERS;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      info.admin_parse = Array.isArray(parsed)
        ? { array: true, count: parsed.length, users: parsed.map((u: { username?: unknown }) => String(u?.username)) }
        : { array: false, type: typeof parsed };
    } catch (err) {
      info.admin_parse = { error: String(err).slice(0, 120) };
    }
  }

  return new Response(JSON.stringify(info), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
};
