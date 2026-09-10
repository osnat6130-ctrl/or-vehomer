/* POST /api/login  { username, password, remember }
 * מצליח -> 200 { name, username } + עוגיית התחברות. נכשל -> 401 (אחרי השהיה קצרה). */
import { authenticate } from "../../server/auth";
import type { Env } from "../../server/env";
import { error, json, readJson, sleep } from "../../server/http";
import { createToken, sessionCookie } from "../../server/session";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { username?: unknown; password?: unknown; remember?: unknown };
  try {
    body = await readJson(request);
  } catch {
    return error(400, "בקשה לא תקינה");
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === true;
  if (!username || !password) return error(400, "צריך שם משתמש וסיסמה");

  let user;
  try {
    user = await authenticate(env, username, password);
  } catch (e) {
    console.error(e);
    return error(500, "הפאנל לא מוגדר (ADMIN_USERS)");
  }
  if (!user) {
    await sleep(600); // מאט ניחושים
    return error(401, "שם משתמש או סיסמה שגויים");
  }

  const token = await createToken(env, { username: user.username, name: user.name }, remember);
  return json(200, { name: user.name, username: user.username }, { "Set-Cookie": sessionCookie(env, token, remember) });
};
