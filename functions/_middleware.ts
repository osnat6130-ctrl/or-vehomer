/* רץ לפני כל בקשה.
 *
 * 1. www -> הכתובת הראשית (301). שתי הכתובות הן שני origins שונים
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

  if (url.hostname === `www.${CANONICAL_HOST}`) {
    url.hostname = CANONICAL_HOST;
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
