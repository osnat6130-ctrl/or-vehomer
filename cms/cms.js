/* ============================================================================
   מצב העריכה על האתר החי - אור וחומר
   ----------------------------------------------------------------------------
   נטען (מ-main.js) רק אחרי כניסה בפאנל. מאמת מול השרת, טוען את התוכן
   העדכני מהריפו, ומאפשר לערוך במקום כל אלמנט עם data-cms: טקסט
   (contenteditable), תמונה (דיאלוג העלאה) וסרטון. "שמירה ופרסום" שולח
   את קובץ התוכן לשרת, שיוצר commit - וקלאודפלייר בונה ומפרסמת.
   ========================================================================== */
(function () {
  "use strict";

  var FLAG = "ov-admin";
  var EDIT_KEY = "ov-editing";
  var VERSION = "20260910a";

  /* ---------- CSS של מצב העריכה ---------- */
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/cms/cms.css?v=" + VERSION;
  document.head.appendChild(link);

  /* ---------- API ---------- */
  function ApiError(status, message) {
    this.status = status;
    this.message = message;
  }
  ApiError.prototype = Object.create(Error.prototype);

  function request(path, init) {
    init = init || {};
    return fetch(path, {
      credentials: "same-origin",
      method: init.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
    }).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          if (!res.ok) throw new ApiError(res.status, data.error || "שגיאה " + res.status);
          return data;
        });
    });
  }
  var api = {
    me: function () { return request("/api/me"); },
    content: function () { return request("/api/content"); },
    save: function (payload) { return request("/api/content", { method: "PUT", body: payload }); },
    history: function () { return request("/api/history"); },
    version: function (sha) { return request("/api/history?sha=" + encodeURIComponent(sha)); },
    upload: function (payload) { return request("/api/asset", { method: "POST", body: payload }); },
    logout: function () { return request("/api/logout", { method: "POST" }); },
  };

  /* ---------- תיאור נתיבים בעברית ---------- */
  var PAGES = {
    index: "דף הבית",
    hugim: "חוגי קרמיקה",
    sadnaot: "סדנאות",
    painting: "צביעת קרמיקה",
    about: "אודות",
    contact: "צור קשר",
    shared: "כל הדפים",
  };
  var LABELS = {
    hero: "פתיחה", head: "פתיחה", kicker: "כותרת עליונה", title: "כותרת", titleLight: "כותרת", titleBold: "כותרת",
    tagline: "משפט מפתח", lead: "פסקת פתיחה", text: "טקסט", quote: "ציטוט", callout: "הדגשה", subhead: "כותרת משנה",
    facts: "נתון", label: "תווית", labelShort: "תווית קצרה", value: "ערך", note: "הערה", num: "מספר",
    btnCourses: "כפתור לחוגים", btnWhatsapp: "כפתור וואטסאפ", btnPhone: "כפתור טלפון", btn: "כפתור", link: "קישור",
    intro: "ברוכים הבאים", stats: "אריח", paths: "בחרו את המסלול", cards: "כרטיס", why: "למה לבחור", items: "פריט",
    studio: "הסטודיו", works: "הצצה ליופי", images: "תמונה", meet: "נעים מאוד", image: "תמונה", imageMain: "תמונה ראשית",
    imageAccent: "תמונה קטנה", src: "קובץ", alt: "תיאור תמונה", courses: "חוג", chip: "תגית", bullets: "נקודה",
    price: "מחיר", pricePer: "פירוט מחיר", banner: "באנר", mosdot: "בתי ספר ומוסדות", activities: "מתאים גם ל",
    how: "איך זה עובד", steps: "שלב", cta: "פנייה", area: "אזורי שירות", what: "מה אפשר לצבוע", caption: "כיתוב",
    story: "בקצרה עלי", tag: "תגית", video: "סרטון", wa: "וואטסאפ", tel: "טלפון", badge: "תג", rows: "שורה",
    btnMaps: "כפתור מפות", btnWaze: "כפתור Waze", mapChip: "כתובת על המפה", onsite: "מגיעה אליכם", cities: "יישוב",
    citiesTitle: "כותרת היישובים", a11y: "הצהרת נגישות", footer: "פוטר", brand: "שם האתר", copyright: "זכויות",
  };
  function describePath(path) {
    var parts = path.split(".");
    var page = PAGES[parts[0]] || "האתר";
    var words = [];
    for (var i = 1; i < parts.length; i++) {
      var key = parts[i];
      if (/^\d+$/.test(key)) continue;
      var next = parts[i + 1];
      var label = LABELS[key] || key;
      var word = next !== undefined && /^\d+$/.test(next) ? label + " " + (Number(next) + 1) : label;
      if (words[words.length - 1] !== word) words.push(word);
    }
    return { page: page, field: words.join(", ") || "תוכן" };
  }
  function describeChanges(paths) {
    var byPage = {};
    var order = [];
    paths.forEach(function (p) {
      var d = describePath(p);
      if (!byPage[d.page]) { byPage[d.page] = []; order.push(d.page); }
      if (byPage[d.page].indexOf(d.field) < 0) byPage[d.page].push(d.field);
    });
    var head = paths.length === 1 ? "עדכון אחד" : paths.length + " עדכונים";
    var details = order.map(function (p) { return p + " (" + byPage[p].join(", ") + ")"; }).join("; ");
    var msg = head + ": " + details;
    return msg.length > 200 ? msg.slice(0, 197) + "..." : msg;
  }

  /* ---------- החנות ---------- */
  var content = null;
  var original = null;
  var sha = null;
  var dirty = {};
  var editing = true;
  try { editing = sessionStorage.getItem(EDIT_KEY) !== "0"; } catch (e) {}
  var userName = "";

  var clone = function (v) { return JSON.parse(JSON.stringify(v)); };
  var isLeaf = function (v) { return v === null || typeof v !== "object"; };

  function getFrom(root, path) {
    var node = root;
    var keys = path.split(".");
    for (var i = 0; i < keys.length; i++) {
      if (node === null || typeof node !== "object") return undefined;
      node = node[keys[i]];
    }
    return node;
  }
  function getValue(path) { return getFrom(content, path); }
  function setValue(path, value) {
    var keys = path.split(".");
    var node = content;
    for (var i = 0; i < keys.length - 1; i++) {
      if (node[keys[i]] === undefined || node[keys[i]] === null) node[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      node = node[keys[i]];
    }
    node[keys[keys.length - 1]] = value;
    var before = getFrom(original, path);
    if (JSON.stringify(before) === JSON.stringify(value)) delete dirty[path];
    else dirty[path] = true;
    syncDom(path);
    renderBar();
  }
  function dirtyPaths() { return Object.keys(dirty); }

  /* ---------- DOM <-> תוכן ---------- */
  function elementsFor(path) {
    return Array.prototype.slice.call(document.querySelectorAll('[data-cms="' + path.replace(/"/g, '\\"') + '"]'));
  }
  function syncElement(el) {
    var path = el.getAttribute("data-cms");
    var type = el.getAttribute("data-cms-type") || "text";
    var value = getValue(path);
    if (value === undefined) return;
    if (type === "image") {
      if (value && typeof value === "object") {
        if (value.src) el.setAttribute("src", value.src);
        if (typeof value.alt === "string") el.setAttribute("alt", value.alt);
      }
    } else if (type === "video") {
      var src = value && typeof value === "object" ? value.src : value;
      var source = el.querySelector("source");
      if (src && source && source.getAttribute("src") !== src) { source.setAttribute("src", src); el.load(); }
      else if (src && !source && el.getAttribute("src") !== src) { el.setAttribute("src", src); el.load(); }
    } else if (typeof value === "string") {
      if (el.textContent !== value) el.textContent = value;
    }
  }
  function syncDom(path) {
    if (path) elementsFor(path).forEach(syncElement);
    else Array.prototype.forEach.call(document.querySelectorAll("[data-cms]"), syncElement);
  }

  /* ---------- מיזוג לשחזור (הישן מנצח, מפתחות חדשים נשמרים) ---------- */
  function mergeRestore(target, source) {
    if (isLeaf(source)) return clone(source);
    if (Array.isArray(source)) {
      if (!Array.isArray(target)) return clone(source);
      target.length = source.length;
      source.forEach(function (item, i) { target[i] = mergeRestore(target[i], item); });
      return target;
    }
    if (isLeaf(target) || Array.isArray(target)) return clone(source);
    Object.keys(source).forEach(function (k) { target[k] = mergeRestore(target[k], source[k]); });
    return target;
  }
  function collectLeaves(node, prefix, out) {
    if (isLeaf(node)) { out[prefix] = node; return; }
    if (Array.isArray(node)) { node.forEach(function (item, i) { collectLeaves(item, prefix + "." + i, out); }); return; }
    Object.keys(node).forEach(function (k) { collectLeaves(node[k], prefix + "." + k, out); });
  }
  function diffTrees(before, after) {
    var a = {}, b = {};
    Object.keys(before || {}).forEach(function (k) { collectLeaves(before[k], k, a); });
    Object.keys(after || {}).forEach(function (k) { collectLeaves(after[k], k, b); });
    var changes = [];
    Object.keys(a).forEach(function (p) {
      if (!(p in b)) changes.push({ path: p, kind: "removed", before: a[p], after: undefined });
      else if (a[p] !== b[p]) changes.push({ path: p, kind: "changed", before: a[p], after: b[p] });
    });
    Object.keys(b).forEach(function (p) { if (!(p in a)) changes.push({ path: p, kind: "added", before: undefined, after: b[p] }); });
    return changes.sort(function (x, y) { return x.path < y.path ? -1 : x.path > y.path ? 1 : 0; });
  }
  function recomputeDirty() {
    dirty = {};
    diffTrees(original, content).forEach(function (c) { dirty[c.path] = true; });
  }

  /* ---------- עריכה במקום ---------- */
  var active = null;
  function commitActive() {
    if (!active) return;
    var a = active;
    active = null;
    a.el.removeAttribute("contenteditable");
    var value = a.el.innerText.replace(/ /g, " ").replace(/\s+/g, " ").trim();
    if (!value) { a.el.textContent = a.before; return; }
    if (value !== a.before) setValue(a.path, value);
    else a.el.textContent = a.before;
  }
  function cancelActive() {
    if (!active) return;
    var a = active;
    active = null;
    a.el.removeAttribute("contenteditable");
    a.el.textContent = a.before;
  }
  function onClick(e) {
    if (!editing) return;
    var clicked = e.target;
    if (!(clicked instanceof Element)) return;
    if (clicked.closest("[data-cms-toolbar]")) { return; }
    var target = clicked.closest("[data-cms]");
    if (!target) {
      var container = clicked.closest("button, a, figure, li, .why-media, .act-media");
      var inside = container && container.querySelector('[data-cms-type="image"], [data-cms]');
      if (inside) target = inside;
    }
    if (!target) { if (active) commitActive(); return; }
    e.preventDefault();
    e.stopPropagation();
    if (active && active.el === target) return;
    if (active) commitActive();
    var type = target.getAttribute("data-cms-type") || "text";
    var path = target.getAttribute("data-cms");
    if (type === "image") { openImageDialog(path); return; }
    if (type === "video") { openVideoDialog(path); return; }
    var current = getValue(path);
    var before = typeof current === "string" ? current : target.innerText.trim();
    target.setAttribute("contenteditable", "plaintext-only");
    if (!target.isContentEditable) target.setAttribute("contenteditable", "true");
    active = { el: target, path: path, before: before };
    target.focus();
    var range = document.createRange();
    range.selectNodeContents(target);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  function onKey(e) {
    if (!active) return;
    if (e.key === "Escape") { e.preventDefault(); cancelActive(); }
    else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitActive(); }
  }
  function onBlur(e) { if (active && e.target === active.el) commitActive(); }

  function setEditing(on) {
    editing = on;
    document.documentElement.classList.toggle("cms-editing", on);
    try { sessionStorage.setItem(EDIT_KEY, on ? "1" : "0"); } catch (err) {}
    if (!on) commitActive();
    renderBar();
  }

  /* ---------- הסרגל ---------- */
  var bar, barInner;
  var status = { kind: "ready", message: "" };
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "onclick") node.addEventListener("click", attrs[k]);
      else if (k === "html") node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function renderBar() {
    if (!bar) {
      bar = el("div", { class: "cms-bar", "data-cms-toolbar": "", dir: "rtl" });
      barInner = el("div", { class: "cms-bar-inner" });
      bar.appendChild(barInner);
      document.body.appendChild(bar);
    }
    barInner.innerHTML = "";
    var count = dirtyPaths().length;
    barInner.appendChild(el("span", { class: "cms-name", text: "שלום, " + userName }));
    barInner.appendChild(el("button", { type: "button", class: "cms-toggle" + (editing ? " is-on" : ""), text: editing ? "מצב עריכה: פועל" : "התחלת עריכה", onclick: function () { setEditing(!editing); } }));
    if (count) barInner.appendChild(el("span", { class: "cms-count", text: count === 1 ? "שינוי אחד" : count + " שינויים" }));
    var saveBtn = el("button", { type: "button", class: "cms-save", text: status.kind === "saving" ? "שומרת..." : "שמירה ופרסום", onclick: save });
    if (!count || status.kind === "saving") saveBtn.disabled = true;
    barInner.appendChild(saveBtn);
    if (count) barInner.appendChild(el("button", { type: "button", text: "ביטול", onclick: discard }));
    barInner.appendChild(el("button", { type: "button", text: "היסטוריה", onclick: openHistory }));
    barInner.appendChild(el("button", { type: "button", text: "יציאה", onclick: logout }));
    if (status.kind === "saved") barInner.appendChild(el("span", { class: "cms-status", text: "נשמר. האתר מתעדכן תוך כדקה" }));
    if (status.kind === "error") barInner.appendChild(el("span", { class: "cms-status is-error", text: status.message }));
  }

  function save() {
    commitActive();
    var paths = dirtyPaths();
    if (!paths.length || status.kind === "saving") return Promise.resolve();
    status = { kind: "saving" };
    renderBar();
    return api
      .save({ message: describeChanges(paths), site: content, shas: { site: sha } })
      .then(function (result) {
        sha = result.saved.site.sha;
        original = clone(content);
        dirty = {};
        status = { kind: "saved" };
        renderBar();
      })
      .catch(function (e) {
        var message = e instanceof ApiError && e.status === 409
          ? "מישהי אחרת שמרה בינתיים. רעננו את הדף, והשינויים שלכן יצטרכו להיעשות שוב."
          : e.message || "השמירה נכשלה";
        status = { kind: "error", message: message };
        renderBar();
      });
  }
  function discard() {
    var count = dirtyPaths().length;
    if (!count) return;
    if (!confirm("לבטל " + count + " שינויים שלא נשמרו?")) return;
    cancelActive();
    content = clone(original);
    dirty = {};
    syncDom();
    status = { kind: "ready" };
    renderBar();
  }
  function logout() {
    if (dirtyPaths().length && !confirm("יש שינויים שלא נשמרו. לצאת בכל זאת?")) return;
    setEditing(false);
    api.logout().catch(function () {}).then(function () {
      try { localStorage.removeItem(FLAG); } catch (e) {}
      location.reload();
    });
  }

  /* ---------- דיאלוגים ---------- */
  var overlay = null;
  function closeDialog() {
    if (overlay) { overlay.remove(); overlay = null; }
    document.removeEventListener("keydown", onDialogKey);
  }
  function onDialogKey(e) { if (e.key === "Escape") closeDialog(); }
  function openDialog(titleText, subText, wide) {
    closeDialog();
    var body = el("div", { class: "cms-dialog-body" });
    var foot = el("div", { class: "cms-dialog-foot" });
    var dialog = el("div", { class: "cms-dialog" + (wide ? " is-wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": titleText }, [
      el("div", { class: "cms-dialog-head" }, [
        el("div", {}, [el("h2", { text: titleText }), subText ? el("p", { text: subText }) : null]),
        el("button", { type: "button", class: "cms-close", "aria-label": "סגירה", text: "×", onclick: closeDialog }),
      ]),
      body,
      foot,
    ]);
    overlay = el("div", { class: "cms-overlay", "data-cms-toolbar": "", dir: "rtl" }, [dialog]);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeDialog(); });
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onDialogKey);
    return { body: body, foot: foot };
  }
  function footer(foot) {
    foot.innerHTML = "";
    var count = dirtyPaths().length;
    foot.appendChild(el("span", { text: count ? "השינוי עדיין לא פורסם באתר." : "אין שינויים שממתינים לפרסום." }));
    var right = el("div", {}, [
      el("button", { type: "button", class: "cms-btn is-ghost", text: "סגירה", onclick: closeDialog }),
      (function () {
        var b = el("button", { type: "button", class: "cms-btn is-green", text: "שמירה ופרסום", onclick: function () { save().then(closeDialog); } });
        if (!count) b.disabled = true;
        return b;
      })(),
    ]);
    foot.appendChild(right);
  }

  /* --- הכנת תמונה (הקטנה ודחיסה בדפדפן) --- */
  function prepareImage(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error("זה לא קובץ תמונה"));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, 2000 / img.naturalWidth, 2000 / img.naturalHeight);
        var w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        var dataUrl = canvas.toDataURL("image/webp", 0.82);
        var contentType = "image/webp";
        if (dataUrl.indexOf("data:image/webp") !== 0) { dataUrl = canvas.toDataURL("image/jpeg", 0.82); contentType = "image/jpeg"; }
        var base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
        var bytes = Math.floor((base64.replace(/=+$/, "").length * 3) / 4);
        if (bytes > 4 * 1024 * 1024) return reject(new Error("התמונה גדולה מדי גם אחרי דחיסה. נסי תמונה קטנה יותר."));
        resolve({ name: file.name, contentType: contentType, base64: base64, dataUrl: dataUrl });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("לא הצלחתי לקרוא את התמונה")); };
      img.src = url;
    });
  }

  function openImageDialog(path) {
    var value = getValue(path);
    var current = value && typeof value === "object" ? value : { src: "", alt: "" };
    var d = describePath(path);
    var ui = openDialog("החלפת תמונה", d.page + " · " + d.field);
    var alert = el("div", { class: "cms-alert" }); alert.hidden = true;
    var preview = el("div", { class: "cms-preview" }, [current.src ? el("img", { src: current.src, alt: "" }) : el("p", { text: "אין תמונה" })]);
    var busy = el("p", { class: "cms-busy" }); busy.hidden = true;
    var input = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp" }); input.hidden = true;
    var pick = el("button", { type: "button", class: "cms-btn is-block", text: "בחירת תמונה מהמחשב", onclick: function () { input.click(); } });
    var altField = el("label", { class: "cms-field", text: "תיאור התמונה (לנגישות)" });
    var altInput = el("input", { type: "text", value: current.alt || "", placeholder: "למשל: ילדה מחזיקה פסלון שיצרה" });
    altField.appendChild(altInput);
    altInput.addEventListener("change", function () {
      var v = getValue(path);
      setValue(path, { src: (v && v.src) || "", alt: altInput.value });
      footer(ui.foot);
    });
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      input.value = "";
      if (!file) return;
      alert.hidden = true; busy.hidden = false; busy.textContent = "מעלה את התמונה..."; pick.disabled = true;
      prepareImage(file)
        .then(function (img) {
          preview.innerHTML = ""; preview.appendChild(el("img", { src: img.dataUrl, alt: "" }));
          return api.upload({ name: img.name, contentType: img.contentType, base64: img.base64 });
        })
        .then(function (res) {
          setValue(path, { src: res.path, alt: altInput.value });
          footer(ui.foot);
        })
        .catch(function (e) { alert.textContent = e.message || "ההעלאה נכשלה"; alert.hidden = false; })
        .then(function () { busy.hidden = true; pick.disabled = false; });
    });
    ui.body.appendChild(alert);
    ui.body.appendChild(preview);
    ui.body.appendChild(busy);
    ui.body.appendChild(pick);
    ui.body.appendChild(input);
    ui.body.appendChild(el("p", { class: "cms-note", text: "התמונה מוקטנת ונדחסת אוטומטית לפני ההעלאה, כדי שהאתר יישאר מהיר" }));
    ui.body.appendChild(altField);
    footer(ui.foot);
  }

  function openVideoDialog(path) {
    var value = getValue(path);
    var current = value && typeof value === "object" ? value.src : value;
    var d = describePath(path);
    var ui = openDialog("החלפת סרטון", d.page + " · " + d.field);
    var alert = el("div", { class: "cms-alert" }); alert.hidden = true;
    var warn = el("div", { class: "cms-warn" }); warn.hidden = true;
    var preview = el("div", { class: "cms-preview is-video" }, [current ? el("video", { src: current, controls: "", preload: "metadata", playsinline: "" }) : el("p", { text: "אין סרטון" })]);
    var busy = el("p", { class: "cms-busy" }); busy.hidden = true;
    var input = el("input", { type: "file", accept: "video/mp4,video/webm" }); input.hidden = true;
    var pick = el("button", { type: "button", class: "cms-btn is-block", text: "בחירת סרטון מהמחשב", onclick: function () { input.click(); } });
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      input.value = "";
      if (!file) return;
      alert.hidden = true; warn.hidden = true;
      if (file.type !== "video/mp4" && file.type !== "video/webm") { alert.textContent = "אפשר להעלות MP4 או WebM בלבד."; alert.hidden = false; return; }
      if (file.size > 20 * 1024 * 1024) { alert.textContent = "הסרטון גדול מדי (מעל 20MB). אפשר לקצר אותו או לייצא באיכות נמוכה יותר."; alert.hidden = false; return; }
      if (file.size > 8 * 1024 * 1024) { warn.textContent = "הסרטון כבד (מעל 8MB). הוא יעבוד, אבל יאט את הדף בגלישה סלולרית."; warn.hidden = false; }
      busy.hidden = false; busy.textContent = "מעלה את הסרטון..."; pick.disabled = true;
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result);
        var base64 = result.slice(result.indexOf(",") + 1);
        api.upload({ name: file.name, contentType: file.type, base64: base64 })
          .then(function (res) {
            setValue(path, { src: res.path });
            preview.innerHTML = ""; preview.appendChild(el("video", { src: res.path, controls: "", preload: "metadata", playsinline: "" }));
            footer(ui.foot);
          })
          .catch(function (e) { alert.textContent = e.message || "ההעלאה נכשלה"; alert.hidden = false; })
          .then(function () { busy.hidden = true; pick.disabled = false; });
      };
      reader.onerror = function () { alert.textContent = "קריאת הסרטון נכשלה"; alert.hidden = false; busy.hidden = true; pick.disabled = false; };
      reader.readAsDataURL(file);
    });
    ui.body.appendChild(alert);
    ui.body.appendChild(warn);
    ui.body.appendChild(preview);
    ui.body.appendChild(busy);
    ui.body.appendChild(pick);
    ui.body.appendChild(input);
    ui.body.appendChild(el("p", { class: "cms-note", text: "MP4 או WebM, עד 20MB. סרטונים לא נדחסים אוטומטית." }));
    footer(ui.foot);
  }

  /* --- היסטוריה --- */
  var dateFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  function preview(v) {
    if (v === undefined) return "(לא היה קיים)";
    if (v === null) return "(ריק)";
    var t = String(typeof v === "object" ? JSON.stringify(v) : v);
    if (!t.trim()) return "(ריק)";
    return t.length > 140 ? t.slice(0, 137) + "..." : t;
  }
  function openHistory() {
    var ui = openDialog("היסטוריית שינויים", "כל שמירה נשמרת לנצח. אפשר לחזור לכל גרסה.", true);
    ui.foot.appendChild(el("button", { type: "button", class: "cms-btn is-ghost", text: "סגירה", onclick: closeDialog }));
    var list = el("ol", { class: "cms-history" });
    var loading = el("p", { text: "טוענת..." });
    ui.body.appendChild(loading);
    ui.body.appendChild(list);
    api.history().then(function (r) {
      loading.remove();
      if (!r.commits.length) { ui.body.appendChild(el("p", { text: "עוד לא נשמרו שינויים." })); return; }
      r.commits.forEach(function (c, i) {
        var detail = el("div", { class: "cms-commit-detail" }); detail.hidden = true;
        var item = el("li", {}, [
          el("button", { type: "button", class: "cms-commit", onclick: function () { toggle(); } }, [
            el("span", { text: i === 0 ? "🟢" : "🕘" }),
            el("span", {}, [
              el("span", { class: "cms-commit-msg", text: c.message }),
              el("span", { class: "cms-commit-meta", html: escapeHtml(c.author + " · " + dateFormat.format(new Date(c.date))) + (i === 0 ? '<span class="cms-live">הגרסה באוויר</span>' : "") }),
            ]),
          ]),
          detail,
        ]);
        list.appendChild(item);
        var loaded = false;
        function toggle() {
          detail.hidden = !detail.hidden;
          if (loaded || detail.hidden) return;
          loaded = true;
          detail.textContent = "משווה לגרסה הנוכחית...";
          api.version(c.sha).then(function (v) {
            detail.innerHTML = "";
            if (!v.site) { detail.appendChild(el("p", { text: "בגרסה הזאת עוד לא היה קובץ תוכן." })); return; }
            var all = diffTrees(v.site, content);
            var changes = all.filter(function (x) { return x.kind !== "added"; });
            if (!changes.length) { detail.appendChild(el("p", { text: "התוכן בגרסה הזאת זהה למה שבאתר - אין מה לשחזר." })); return; }
            var head = el("div", { class: "cms-change-head" }, [
              el("span", { text: changes.length === 1 ? "שדה אחד שונה מהתוכן הנוכחי" : changes.length + " שדות שונים מהתוכן הנוכחי" }),
              el("button", { type: "button", class: "cms-btn is-soft", text: "שחזור הגרסה כולה", onclick: function () {
                if (!confirm("להחזיר " + changes.length + " שדות לגרסה הזאת? השינויים ייטענו לעריכה ולא יישמרו עד שתלחצי \"שמירה ופרסום\".")) return;
                mergeRestore(content, v.site);
                recomputeDirty();
                syncDom();
                setEditing(true);
                closeDialog();
              } }),
            ]);
            detail.appendChild(head);
            var ul = el("ul", { class: "cms-changes" });
            changes.slice(0, 60).forEach(function (ch) {
              var dp = describePath(ch.path);
              var li = el("li", { class: "cms-change" }, [
                el("div", { class: "cms-change-head" }, [
                  el("span", { text: dp.page + " · " + dp.field }),
                  ch.kind === "changed"
                    ? el("button", { type: "button", class: "cms-btn is-soft", text: "שחזור השדה", onclick: function () { setValue(ch.path, ch.before); setEditing(true); li.remove(); } })
                    : el("span", { class: "cms-tag", text: "נמחק מאז" }),
                ]),
                el("p", { html: "<b>בגרסה הזאת:</b> " + escapeHtml(preview(ch.before)) }),
                el("p", { html: "<b>כרגע באתר:</b> " + escapeHtml(preview(ch.after)) }),
              ]);
              ul.appendChild(li);
            });
            detail.appendChild(ul);
            detail.appendChild(el("a", { class: "cms-link", href: c.url, target: "_blank", rel: "noopener", text: "לצפייה בגרסה בגיטהאב" }));
          }).catch(function (e) { detail.textContent = e.message || "טעינת הגרסה נכשלה"; });
        }
      });
    }).catch(function (e) { loading.textContent = e.message || "טעינת ההיסטוריה נכשלה"; });
  }
  function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ---------- הפעלה ---------- */
  api.me()
    .then(function (me) {
      userName = me.name;
      return api.content();
    })
    .then(function (data) {
      content = data.site;
      original = clone(content);
      sha = data.shas.site;
      syncDom();
      document.addEventListener("click", onClick, true);
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("blur", onBlur, true);
      window.addEventListener("beforeunload", function (e) { if (dirtyPaths().length) e.preventDefault(); });
      window.addEventListener("storage", function (e) {
        if (e.key === FLAG && e.newValue !== "1") location.reload();
      });
      setEditing(editing);
    })
    .catch(function (e) {
      if (e instanceof ApiError && e.status === 401) {
        try { localStorage.removeItem(FLAG); } catch (err) {}
        return;
      }
      console.error(e);
      userName = "";
      status = { kind: "error", message: e.message || "שגיאה בטעינת הפאנל" };
      renderBar();
    });
})();
