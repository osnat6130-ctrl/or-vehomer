/* אימות התוכן שמגיע מהפאנל לפני שהוא נכתב לריפו.
 *
 * הסכמה היא "רשת ביטחון" ולא העתק של המבנה: היא מוודאת שכל הערכים הם
 * טקסט/מספר/בוליאני, או מערכים ואובייקטים של אלה - כדי שטעות בפאנל לא
 * תשבור את הבנייה. המבנה עצמו (index.hero.title וכו') נגזר מהתיוג
 * data-cms בדפי ה-HTML. */
import { z } from "zod";

const leaf = z.union([z.string().max(5000), z.number(), z.boolean(), z.null()]);
const contentValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([leaf, z.array(contentValue).max(300), z.record(z.string().max(60), contentValue)]),
);

/** קובץ התוכן: מפתח לכל דף (index, hugim, ...) ואובייקט תוכן תחתיו */
export const siteSchema = z.record(z.string().max(60), z.record(z.string().max(60), contentValue)).refine(
  (obj) => Object.keys(obj).length > 0 && Object.keys(obj).length <= 40,
  "קובץ התוכן ריק או גדול מדי",
);

export const savePayloadSchema = z.object({
  /** תיאור קריא של השינוי - נכנס להודעת ה-commit ולהיסטוריה בפאנל */
  message: z.string().min(2).max(200),
  site: siteSchema,
  /** ה-sha של הקובץ כפי שנקרא - להגנה מדריסה */
  shas: z.object({ site: z.string().min(1) }),
});

export type SavePayload = z.infer<typeof savePayloadSchema>;
