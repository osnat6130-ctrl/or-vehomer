/* רץ לפני כל בקשה.
 *
 * 1. כל מארח שאינו הדומיין הראשי -> הכתובת הראשית (301). שתי הכתובות הן שני origins שונים
 *    בעיני הדפדפן: התחברות לפאנל ב-orvahomer.co.il לא קיימת ב-www,
 *    והמשתמשת רואה אתר בלי סרגל עריכה. וגם מונע תוכן כפול בגוגל.
 *
 * 2. קובץ שלא קיים (למשל תמונה שהועלתה מהפאנל ועוד לא נבנתה) לא
 *    יוחזר כ-HTML עם 200 - כי אז ה-CDN היה שומר את ה-HTML תחת כתובת
 *    התמונה לשבוע. 404 עם no-store לא נשמר במטמון. */

const CANONICAL_HOST = "orvahomer.co.il";
const ASSET_PATH = /\.(jpe?g|png|webp|gif|svg|ico|mp4|webm|mp3|pdf|woff2?|ttf|txt|xml|json|map)$/i;

export const onRequest: PagesFunction = async ({ request, next }) => {
  const url = new URL(request.url);

  /* כל מארח שאינו הדומיין הראשי - www, or-vehomer.pages.dev, וכל
     כתובת preview - מופנה לדומיין. אחרת גוגל מוצא את אותו אתר פעמיים,
     והפאנל חשוף בכתובת שנייה בלי שאף אחד עוקב אחריה.
     localhost נשאר כמות שהוא כדי שפיתוח מקומי יעבוד. */
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".localhost");
  if (!isLocal && url.hostname !== CANONICAL_HOST) {
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  }

  const response = await next();

  if (ASSET_PATH.test(url.pathname) && response.headers.get("content-type")?.includes("text/html")) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return response;
};
