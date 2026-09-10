/* מחלץ את התוכן המתויג (data-cms) מדפי ה-HTML לקובץ content/site.json.
 *
 * מריצים פעם אחת אחרי התיוג הראשון, ואחר כך רק כשמוסיפים שדות חדשים
 * לדפים. הקובץ הזה הוא מקור האמת של התוכן: הפאנל עורך אותו, וסקריפט
 * הבנייה מזריק אותו חזרה לדפים.
 *
 * מפתחות שקיימים כבר ב-site.json נשמרים כפי שהם (התוכן שבקובץ מנצח);
 * רק מפתחות חדשים מתווספים מה-HTML. כך הרצה חוזרת לא דורסת עריכות. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "node-html-parser";

const PAGES = ["index.html", "hugim.html", "sadnaot.html", "painting.html", "about.html", "contact.html"];
const OUT = "content/site.json";

const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const content = existing;
let added = 0;

function setPath(obj, path, value) {
  const keys = path.split(".");
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const nextIsIndex = /^\d+$/.test(keys[i + 1]);
    if (node[k] === undefined) node[k] = nextIsIndex ? [] : {};
    node = node[k];
  }
  const last = keys[keys.length - 1];
  if (node[last] !== undefined) return false;
  node[last] = value;
  return true;
}

const clean = (s) => s.replace(/\s+/g, " ").trim();

for (const file of PAGES) {
  const root = parse(readFileSync(file, "utf8"));
  for (const el of root.querySelectorAll("[data-cms]")) {
    const path = el.getAttribute("data-cms");
    const type = el.getAttribute("data-cms-type") ?? "text";
    let value;
    if (type === "image") {
      value = { src: el.getAttribute("src") ?? "", alt: el.getAttribute("alt") ?? "" };
    } else if (type === "video") {
      const source = el.querySelector("source");
      value = { src: source?.getAttribute("src") ?? el.getAttribute("src") ?? "" };
    } else {
      value = clean(el.text);
    }
    if (setPath(content, path, value)) added++;
  }
}

mkdirSync("content", { recursive: true });
writeFileSync(OUT, JSON.stringify(content, null, 2) + "\n", "utf8");
console.log(`${OUT}: ${added} שדות חדשים נוספו`);
