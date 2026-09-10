/* גישה לריפו דרך GitHub Contents API. הטוקן חי רק כאן, בשרת.
 *
 * כל שמירה מהפאנל היא commit רגיל בענף - כך שההיסטוריה, השחזור
 * והפרסום האוטומטי ב-Cloudflare Pages עובדים בלי שום מנגנון נוסף. */
import { branch, isLocal, requireEnv, type Env } from "./env";

const API = "https://api.github.com";

type FileResponse = { content: string; sha: string; encoding: string; path: string };

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function gh(env: Env, path: string, init: RequestInit = {}) {
  /* בפיתוח מקומי בלי טוקן קוראים אנונימית (הריפו ציבורי). שמירה תיכשל
     ב-401, וזו ההתנהגות הנכונה. בפרודקשן הטוקן תמיד נדרש. */
  const anonymous = isLocal(env) && !env.GITHUB_TOKEN;
  return fetch(`${API}/repos/${requireEnv(env, "GITHUB_REPO")}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      ...(anonymous ? {} : { Authorization: `Bearer ${requireEnv(env, "GITHUB_TOKEN")}` }),
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "or-vehomer-admin",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
}

/* base64 רגיל (לא url-safe) - זה מה ש-GitHub מצפה לו */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** קורא קובץ טקסט מהענף. מחזיר את התוכן ואת ה-sha (נדרש לכתיבה) */
export async function readFile(env: Env, path: string): Promise<{ text: string; sha: string }> {
  const res = await gh(env, `/contents/${path}?ref=${encodeURIComponent(branch(env))}`);
  if (!res.ok) throw new GitHubError(res.status, `קריאת ${path} נכשלה (${res.status})`);
  const data = (await res.json()) as FileResponse;
  return { text: fromBase64(data.content), sha: data.sha };
}

/** קורא קובץ כפי שהיה ב-commit מסוים. 404 מוחזר כ-null. */
export async function readFileAtRef(env: Env, path: string, ref: string): Promise<string | null> {
  const res = await gh(env, `/contents/${path}?ref=${encodeURIComponent(ref)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(res.status, `קריאת ${path} בגרסה ${ref.slice(0, 7)} נכשלה (${res.status})`);
  const data = (await res.json()) as FileResponse;
  return fromBase64(data.content);
}

export type CommitSummary = {
  sha: string;
  date: string;
  author: string;
  message: string;
  url: string;
};

type CommitsResponse = {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } };
}[];

/** ההיסטוריה של תיקיית התוכן, מהחדש לישן. */
export async function listContentCommits(env: Env, path: string, limit: number): Promise<CommitSummary[]> {
  const params = new URLSearchParams({
    path,
    sha: branch(env),
    per_page: String(Math.min(Math.max(limit, 1), 100)),
  });
  const res = await gh(env, `/commits?${params}`);
  if (!res.ok) throw new GitHubError(res.status, `קריאת ההיסטוריה נכשלה (${res.status})`);
  const data = (await res.json()) as CommitsResponse;
  return data.map((c) => ({
    sha: c.sha,
    date: c.commit.author.date,
    author: c.commit.author.name,
    message: c.commit.message.split("\n")[0],
    url: c.html_url,
  }));
}

export type CommitAuthor = { name: string; email: string };

/** האם קובץ קיים בענף, ומה ה-sha שלו (נדרש כדי לדרוס) */
export async function fileSha(env: Env, path: string): Promise<string | null> {
  const res = await gh(env, `/contents/${path}?ref=${encodeURIComponent(branch(env))}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(res.status, `בדיקת ${path} נכשלה (${res.status})`);
  return ((await res.json()) as FileResponse).sha;
}

/** כותב קובץ בינארי (תמונה/סרטון) מ-base64 מוכן, בלי לקודד מחדש. */
export async function writeBinaryFile(
  env: Env,
  path: string,
  base64: string,
  message: string,
  author: CommitAuthor,
): Promise<{ sha: string; commitUrl: string }> {
  const sha = await fileSha(env, path);
  const res = await gh(env, `/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: base64,
      branch: branch(env),
      committer: author,
      author,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new GitHubError(res.status, `העלאת ${path} נכשלה (${res.status})`);
  const data = (await res.json()) as { content: { sha: string }; commit: { html_url: string } };
  return { sha: data.content.sha, commitUrl: data.commit.html_url };
}

/** כותב קובץ ויוצר commit. sha חייב להתאים לגרסה שנקראה - אחרת 409. */
export async function writeFile(
  env: Env,
  path: string,
  text: string,
  sha: string | undefined,
  message: string,
  author: CommitAuthor,
): Promise<{ sha: string; commitSha: string; commitUrl: string }> {
  const res = await gh(env, `/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: toBase64(text), sha, branch: branch(env), committer: author, author }),
  });
  if (res.status === 409 || res.status === 422) {
    throw new GitHubError(409, "הקובץ השתנה בינתיים - טענו מחדש ונסו שוב");
  }
  if (!res.ok) throw new GitHubError(res.status, `שמירת ${path} נכשלה (${res.status})`);
  const data = (await res.json()) as { content: { sha: string }; commit: { sha: string; html_url: string } };
  return { sha: data.content.sha, commitSha: data.commit.sha, commitUrl: data.commit.html_url };
}
