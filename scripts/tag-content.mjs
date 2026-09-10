/* מסמן (פעם אחת) את האלמנטים הניתנים לעריכה בדפי ה-HTML: מוסיף
 * data-cms="index.hero.title" וכדומה. הפאנל, סקריפט החילוץ וסקריפט
 * הבנייה עובדים על התיוג הזה.
 *
 * שימוש: node scripts/tag-content.mjs   (בטוח להריץ שוב - מדלג על מה שכבר מתויג)
 *
 * לכל דף רשימת "שדות": { sel, key } ואופציונלית type ("image"/"video"),
 * wrapText (כשהאלמנט מכיל גם ילדים - עוטפים רק את הטקסט ב-span),
 * ו-each + fields לרשימות (כרטיסים, שלבים, גלריה). */
import { readFileSync, writeFileSync } from "node:fs";
import { parse, TextNode } from "node-html-parser";

const SHARED = [
  { sel: ".footer-brand span", key: "shared.footer.brand" },
  { sel: ".footer-meta:nth-of-type(2)", key: "shared.footer.onsite" },
  { sel: ".footer-bottom > span", key: "shared.footer.copyright" },
];

const FACTS = { sel: ".card-facts > div", each: true, key: "facts.{i}", fields: [{ sel: "dt", key: "label" }, { sel: "dd", key: "value" }] };
const COURSE_FIELDS = [
  { sel: ".course-chip", key: "chip" },
  { sel: ".course-head h2", key: "title" },
  { sel: ".course-lead", key: "lead" },
  { sel: ".photo-main img", key: "imageMain", type: "image" },
  { sel: ".photo-accent img", key: "imageAccent", type: "image" },
  { sel: ".course-subhead", key: "subhead" },
  { sel: ".course-list li", each: true, key: "bullets.{i}" },
  { sel: ".course-callout", key: "callout" },
  { sel: ".course-quote", key: "quote" },
  { sel: ".course-body > p:not(.course-quote):not(.course-callout)", key: "text" },
  { sel: ".price-num", key: "price" },
  { sel: ".price-per", key: "pricePer" },
  FACTS,
  { sel: ".card-cta", key: "btn" },
];
const HOW = { sel: ".how-steps li", each: true, key: "how.steps.{i}", fields: [{ sel: "h3", key: "title" }, { sel: "p", key: "text" }] };

const PAGES = {
  "index.html": [
    { sel: ".hero-v2-bg", key: "index.hero.image", type: "image" },
    { sel: ".hero-v2-kicker", key: "index.hero.kicker" },
    { sel: ".title-light", key: "index.hero.titleLight" },
    { sel: ".title-bold", key: "index.hero.titleBold" },
    { sel: ".hero-v2-tagline", key: "index.hero.tagline" },
    {
      sel: ".hero-v2-facts li",
      each: true,
      key: "index.hero.facts.{i}",
      fields: [
        { sel: ".fact-label:not(:has(span))", key: "label" },
        { sel: ".label-full", key: "label" },
        { sel: ".label-short", key: "labelShort" },
        { sel: ".fact-value", key: "value" },
      ],
    },
    { sel: ".hero-v2-bar-actions .btn-primary", key: "index.hero.btnCourses" },
    { sel: ".hero-v2-bar-actions .btn-whatsapp", key: "index.hero.btnWhatsapp" },
    { sel: ".intro-kicker", key: "index.intro.kicker" },
    { sel: ".intro-title", key: "index.intro.title" },
    { sel: ".intro-lead", key: "index.intro.lead" },
    {
      sel: ".intro-stats li",
      each: true,
      key: "index.intro.stats.{i}",
      fields: [
        { sel: ".stat-num:not(.stat-icon)", key: "num" },
        { sel: ".stat-label", key: "label" },
      ],
    },
    { sel: "#paths-title", key: "index.paths.title" },
    {
      sel: ".card-grid-4 .card",
      each: true,
      key: "index.paths.cards.{i}",
      fields: [
        { sel: "img", key: "image", type: "image" },
        { sel: "h3", key: "title" },
        { sel: "p", key: "text" },
        { sel: ".card-link", key: "link", wrapText: true },
      ],
    },
    { sel: "#why-title", key: "index.why.title" },
    {
      sel: ".why-card",
      each: true,
      key: "index.why.items.{i}",
      fields: [
        { sel: ".why-media img", key: "image", type: "image" },
        { sel: "h3", key: "title" },
        { sel: "p", key: "text" },
      ],
    },
    { sel: ".split-media img", key: "index.studio.image", type: "image" },
    { sel: "#studio-title", key: "index.studio.title" },
    { sel: ".split > div:not(.split-media) > p", key: "index.studio.text" },
    { sel: ".split .btn-whatsapp", key: "index.studio.btnWhatsapp" },
    { sel: "#works-title", key: "index.works.title" },
    { sel: "#works-title + p", key: "index.works.text" },
    { sel: ".scroll-strip img", each: true, key: "index.works.images.{i}", type: "image" },
    { sel: ".meet-kicker", key: "index.meet.kicker" },
    { sel: ".meet-title", key: "index.meet.title" },
    { sel: ".meet-quote", key: "index.meet.quote" },
    { sel: ".meet-text .btn-secondary", key: "index.meet.btn" },
    { sel: ".meet-figure > img", key: "index.meet.image", type: "image" },
    ...SHARED,
  ],
  "hugim.html": [
    { sel: ".masthead-photo", key: "hugim.head.image", type: "image" },
    { sel: ".masthead-title", key: "hugim.head.title" },
    { sel: ".masthead-lead", key: "hugim.head.lead" },
    { sel: ".course", each: true, key: "hugim.courses.{i}", fields: COURSE_FIELDS },
    { sel: "#reg-title", key: "hugim.banner.title" },
    { sel: ".reg-text p", key: "hugim.banner.text" },
    { sel: ".reg-cta", key: "hugim.banner.btn" },
    ...SHARED,
  ],
  "sadnaot.html": [
    { sel: ".masthead-photo", key: "sadnaot.head.image", type: "image" },
    { sel: ".masthead-title", key: "sadnaot.head.title" },
    { sel: ".masthead-lead", key: "sadnaot.head.lead" },
    {
      sel: ".masthead-facts li",
      each: true,
      key: "sadnaot.head.facts.{i}",
      fields: [
        { sel: ".mf-label", key: "label", wrapText: true },
        { sel: ".mf-note", key: "note" },
        { sel: ".mf-value", key: "value" },
      ],
    },
    { sel: ".masthead-actions .btn-whatsapp", key: "sadnaot.head.btnWhatsapp" },
    { sel: "#mosdot", key: "sadnaot.mosdot", fields: COURSE_FIELDS },
    { sel: "#activities-title", key: "sadnaot.activities.title" },
    {
      sel: ".act-card",
      each: true,
      key: "sadnaot.activities.items.{i}",
      fields: [
        { sel: ".act-media img", key: "image", type: "image" },
        { sel: "h3", key: "title", wrapText: true },
        { sel: ".act-price", key: "price" },
        { sel: ".act-body p", key: "text" },
      ],
    },
    { sel: "#how-title", key: "sadnaot.how.title" },
    { ...HOW, key: "sadnaot.how.steps.{i}" },
    { sel: "#hatsaa-title", key: "sadnaot.cta.title" },
    { sel: ".cta-dark-text p:not(.cta-area)", key: "sadnaot.cta.text" },
    { sel: ".cta-area", key: "sadnaot.cta.area" },
    { sel: ".cta-dark-actions .btn-whatsapp", key: "sadnaot.cta.btnWhatsapp" },
    { sel: ".cta-dark-actions .btn-light", key: "sadnaot.cta.btnPhone" },
    ...SHARED,
  ],
  "painting.html": [
    { sel: ".masthead-photo", key: "painting.head.image", type: "image" },
    { sel: ".masthead-title", key: "painting.head.title" },
    { sel: ".masthead-lead", key: "painting.head.lead" },
    {
      sel: ".masthead-facts li",
      each: true,
      key: "painting.head.facts.{i}",
      fields: [
        { sel: ".mf-label", key: "label" },
        { sel: ".mf-value", key: "value" },
      ],
    },
    { sel: ".masthead-actions .btn-whatsapp", key: "painting.head.btnWhatsapp" },
    { sel: "#what-title", key: "painting.what.title" },
    { sel: ".paint-gallery-lead", key: "painting.what.lead" },
    {
      sel: ".paint-gallery li",
      each: true,
      key: "painting.what.items.{i}",
      fields: [
        { sel: "img", key: "image", type: "image" },
        { sel: ".pg-cap", key: "caption" },
      ],
    },
    { sel: "#how-title", key: "painting.how.title" },
    { ...HOW, key: "painting.how.steps.{i}" },
    { sel: "#painting-cta-title", key: "painting.banner.title" },
    { sel: ".reg-text p", key: "painting.banner.text" },
    { sel: ".reg-cta", key: "painting.banner.btn" },
    ...SHARED,
  ],
  "about.html": [
    { sel: ".story-tag", key: "about.story.tag", wrapText: true },
    { sel: ".story-title", key: "about.story.title" },
    { sel: ".story-lead", key: "about.story.lead" },
    { sel: ".story-figure > img", key: "about.story.image", type: "image" },
    { sel: "#video-title", key: "about.video.title" },
    { sel: ".intro-video", key: "about.video.video", type: "video" },
    ...SHARED,
  ],
  "contact.html": [
    { sel: ".contact-hero-text .contact-kicker", key: "contact.hero.kicker" },
    { sel: ".contact-title", key: "contact.hero.title" },
    { sel: ".contact-lead", key: "contact.hero.lead" },
    { sel: ".channel--wa .channel-label", key: "contact.hero.wa.label" },
    { sel: ".channel--wa .channel-cta", key: "contact.hero.wa.cta" },
    { sel: ".channel--tel .channel-label", key: "contact.hero.tel.label" },
    { sel: ".channel--tel .channel-cta", key: "contact.hero.tel.cta" },
    { sel: ".contact-photo img", key: "contact.hero.image", type: "image" },
    { sel: ".contact-badge span", key: "contact.hero.badge" },
    { sel: ".studio-info .contact-kicker", key: "contact.studio.kicker" },
    { sel: "#studio-title", key: "contact.studio.title" },
    {
      sel: ".info-row",
      each: true,
      key: "contact.studio.rows.{i}",
      fields: [
        { sel: "dt", key: "label", wrapText: true },
        { sel: "dd:not(:has(a))", key: "value" },
      ],
    },
    { sel: ".nav-links .btn-primary", key: "contact.studio.btnMaps" },
    { sel: ".nav-links .btn-secondary", key: "contact.studio.btnWaze" },
    { sel: ".map-chip", key: "contact.studio.mapChip", wrapText: true },
    { sel: ".onsite-text .contact-kicker", key: "contact.onsite.kicker" },
    { sel: "#onsite-title", key: "contact.onsite.title" },
    { sel: ".onsite-text > p:not(.contact-kicker)", key: "contact.onsite.text" },
    { sel: ".onsite-text .btn-whatsapp", key: "contact.onsite.btn" },
    { sel: ".city-chips-title", key: "contact.onsite.citiesTitle" },
    { sel: ".city-chips li", each: true, key: "contact.onsite.cities.{i}" },
    { sel: "#a11y-title", key: "contact.a11y.title" },
    { sel: ".a11y-disclosure > p:first-of-type", key: "contact.a11y.text" },
    ...SHARED,
  ],
};

let tagged = 0;

function tagElement(el, key, spec) {
  if (el.getAttribute("data-cms")) return;
  const type = spec.type ?? "text";
  if (type === "image" || type === "video") {
    el.setAttribute("data-cms", key);
    el.setAttribute("data-cms-type", type);
    tagged++;
    return;
  }
  const hasElementChildren = el.childNodes.some((n) => n.nodeType === 1);
  if (hasElementChildren && spec.wrapText) {
    /* עוטפים רק את קטע הטקסט הראשון ב-span, כדי לא לגעת בילדים (חץ, מחיר, קישור) */
    const idx = el.childNodes.findIndex((n) => n.nodeType === 3 && n.rawText.trim());
    if (idx < 0) return;
    const node = el.childNodes[idx];
    const raw = node.rawText;
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    const core = raw.trim();
    const span = parse(`<span data-cms="${key}">${core}</span>`).firstChild;
    const replacement = [];
    if (lead) replacement.push(new TextNode(lead, el));
    span.parentNode = el;
    replacement.push(span);
    if (trail) replacement.push(new TextNode(trail, el));
    el.childNodes.splice(idx, 1, ...replacement);
    tagged++;
    return;
  }
  if (hasElementChildren) {
    console.warn(`  ! ${key}: לאלמנט יש ילדים ולא סומן wrapText - מדלגת (${spec.sel})`);
    return;
  }
  el.setAttribute("data-cms", key);
  tagged++;
}

function apply(root, spec, keyPrefix) {
  const key = keyPrefix ? `${keyPrefix}.${spec.key}` : spec.key;
  const matches = root.querySelectorAll(spec.sel);
  if (!matches.length) {
    console.warn(`  ! לא נמצא: ${spec.sel} (${key})`);
    return;
  }
  const targets = spec.each ? matches : [matches[0]];
  targets.forEach((el, i) => {
    const k = key.replace("{i}", String(i));
    if (spec.fields) {
      for (const field of spec.fields) apply(el, field, k);
    } else {
      tagElement(el, k, spec);
    }
  });
}

for (const [file, specs] of Object.entries(PAGES)) {
  const html = readFileSync(file, "utf8");
  const root = parse(html, { comment: true });
  const before = tagged;
  for (const spec of specs) apply(root, spec, "");
  writeFileSync(file, root.toString(), "utf8");
  console.log(`${file}: ${tagged - before} שדות סומנו`);
}
console.log(`סה"כ ${tagged} שדות`);
