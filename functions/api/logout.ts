/* POST /api/logout - מוחק את עוגיית ההתחברות */
import type { Env } from "../../server/env";
import { json } from "../../server/http";
import { clearedCookie } from "../../server/session";

export const onRequestPost: PagesFunction<Env> = async ({ env }) =>
  json(200, { ok: true }, { "Set-Cookie": clearedCookie(env) });
