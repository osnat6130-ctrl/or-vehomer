/* בונה את האתר לתיקיית dist/: מזריק את התוכן מ-content/site.json לתוך
 * האלמנטים המתויגים (data-cms) בדפי ה-HTML, ומעתיק את שאר הקבצים.
 *
 * זה שלב הבנייה של Cloudflare Pages (npm run build). בלי הפאנל הדפים
 * היו מוגשים כמו שהם; עם הפאנל, הקובץ content/site.json הוא מקור האמת
 * והדפים משמשים כתבניות (עם התוכן הישן כברירת מחדל אם מפתח חסר). */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "node-html-parser";

const DIST = "dist";
const CONTENT = "content/site.json";
const PAGES = ["index.html", "hugim.html", "sadnaot.html", "painting.html", "about.html", "contact.html", "admin.html"];
const COPY = ["style.css", "main.js", "cms", "images", "video", "sitemap.xml", "robots.txt", "_headers"];

const site = existsSync(CONTENT) ? JSON.parse(readFileSync(CONTENT, "utf8")) : {};

function get(obj, path) {
  let node = obj;
  for (const k of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = node[k];
  }
  return node;
}

const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s) => escapeHtml(s).replace(/"/g, "&quot;");

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

let injected = 0;
let missing = 0;
for (const file of PAGES) {
  if (!existsSync(file)) continue;
  const root = parse(readFileSync(file, "utf8"), { comment: true });
  for (const el of root.querySelectorAll("[data-cms]")) {
    const path = el.getAttribute("data-cms");
    const type = el.getAttribute("data-cms-type") ?? "text";
    const value = get(site, path);
    if (value === undefined) {
      missing++;
      continue;
    }
    if (type === "image") {
      if (value && typeof value === "object") {
        if (typeof value.src === "string" && value.src) el.setAttribute("src", escapeAttr(value.src));
        if (typeof value.alt === "string") el.setAttribute("alt", escapeAttr(value.alt));
      }
    } else if (type === "video") {
      const src = value && typeof value === "object" ? value.src : value;
      const source = el.querySelector("source");
      if (typeof src === "string" && src) {
        if (source) source.setAttribute("src", escapeAttr(src));
        else el.setAttribute("src", escapeAttr(src));
      }
    } else if (typeof value === "string") {
      el.set_content(escapeHtml(value));
    }
    injected++;
  }
  writeFileSync(join(DIST, file), root.toString(), "utf8");
}

for (const item of COPY) {
  if (!existsSync(item)) continue;
  cpSync(item, join(DIST, item), { recursive: true });
}

/* /admin -> admin.html (Cloudflare Pages כבר מגישה כתובות נקיות, אבל
   העתק מפורש בתיקייה מבטיח שגם /admin/ יעבוד) */
mkdirSync(join(DIST, "admin"), { recursive: true });
cpSync(join(DIST, "admin.html"), join(DIST, "admin", "index.html"));

console.log(`נבנה dist/: ${injected} שדות הוזרקו, ${missing} מפתחות חסרים ב-${CONTENT} (נשארו כברירת מחדל)`);
console.log(`קבצים: ${readdirSync(DIST).join(", ")}`);
