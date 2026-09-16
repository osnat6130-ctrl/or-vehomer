(function () {
  var root = document.documentElement;

  var navToggle = document.querySelector('.nav-toggle');
  var navMenu = document.getElementById('nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      var open = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
    });
  }

  /* מפת גוגל נטענת רק בלחיצה - עד אז שום פרט על הגולש לא מגיע לגוגל */
  var mapBtn = document.getElementById('map-load');
  if (mapBtn) {
    mapBtn.addEventListener('click', function () {
      var frame = document.createElement('iframe');
      frame.className = 'map-frame';
      frame.src = mapBtn.getAttribute('data-map-src');
      frame.title = mapBtn.getAttribute('data-map-title');
      frame.loading = 'lazy';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      var holder = document.getElementById('map-placeholder');
      holder.parentNode.replaceChild(frame, holder);
      frame.focus();
    });
  }

  var header = document.querySelector('.site-header');
  if (header && document.body.classList.contains('has-hero')) {
    var updateHeader = function () {
      header.classList.toggle('is-transparent', window.scrollY < 40);
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  var a11yFab = document.querySelector('.a11y-fab');
  var a11yPanel = document.getElementById('a11y-panel');
  var A11Y_CLASSES = ['a11y-large-text', 'a11y-high-contrast', 'a11y-underline-links', 'a11y-stop-motion'];

  if (a11yFab && a11yPanel) {
    a11yFab.addEventListener('click', function () {
      var open = a11yPanel.classList.toggle('is-open');
      a11yFab.setAttribute('aria-expanded', String(open));
      if (open) {
        var first = a11yPanel.querySelector('button');
        if (first) first.focus();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && a11yPanel.classList.contains('is-open')) {
        a11yPanel.classList.remove('is-open');
        a11yFab.setAttribute('aria-expanded', 'false');
        a11yFab.focus();
      }
    });

    a11yPanel.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-a11y]');
      if (!btn) return;
      var action = btn.getAttribute('data-a11y');

      if (action === 'reset') {
        A11Y_CLASSES.forEach(function (c) { root.classList.remove(c); });
        a11yPanel.querySelectorAll('[aria-pressed]').forEach(function (b) {
          b.setAttribute('aria-pressed', 'false');
        });
        return;
      }

      var on = root.classList.toggle('a11y-' + action);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  function replaceBrokenImage(img) {
    if (img.closest('.logo-link, .footer-brand, .hero-v2, .masthead')) {
      img.hidden = true;
      var logoLink = img.closest('.logo-link');
      if (logoLink) logoLink.classList.add('logo-missing');
      return;
    }
    var box = document.createElement('div');
    box.className = 'img-fallback';
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', img.alt || 'תמונה');
    box.textContent = 'תמונה תתווסף בקרוב';
    img.replaceWith(box);
  }

  document.querySelectorAll('img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) {
      replaceBrokenImage(img);
      return;
    }
    img.addEventListener('error', function () { replaceBrokenImage(img); });
  });

  /* ===== פאנל ניהול: קוד העריכה נטען רק למי שנכנסה ב-/admin =====
     לגולשת רגילה אין כאן שום בקשה לשרת ושום קוד נוסף. הסימון נשמר
     ב-localStorage בכניסה; cms.js מאמת אותו מול השרת. */
  function loadCms() {
    if (document.getElementById('cms-script')) return;
    var s = document.createElement('script');
    s.id = 'cms-script';
    s.src = '/cms/cms.js?v=20260910a';
    document.body.appendChild(s);
  }
  try {
    if (localStorage.getItem('ov-admin') === '1') loadCms();
    window.addEventListener('storage', function (e) {
      if (e.key === 'ov-admin' && e.newValue === '1') loadCms();
    });
  } catch (e) { /* אחסון חסום - אין פאנל */ }

  /* ===== לייטבוקס לגלריות (.paint-gallery) – לחיצה על תמונה פותחת אותה בגדול ===== */
  var galleryLinks = Array.prototype.slice.call(document.querySelectorAll('.paint-gallery .pg-link'));
  if (galleryLinks.length) {
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'תצוגת תמונה מוגדלת');
    lb.hidden = true;
    lb.innerHTML =
      '<button type="button" class="lb-close" aria-label="סגירה">&times;</button>' +
      '<button type="button" class="lb-prev" aria-label="התמונה הקודמת">&#8250;</button>' +
      '<figure class="lb-figure"><img class="lb-img" alt=""><figcaption class="lb-cap" role="status" aria-live="polite"></figcaption></figure>' +
      '<button type="button" class="lb-next" aria-label="התמונה הבאה">&#8249;</button>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector('.lb-img');
    var lbCap = lb.querySelector('.lb-cap');
    var current = 0;
    var lastFocus = null;

    function showAt(i) {
      current = (i + galleryLinks.length) % galleryLinks.length;
      var link = galleryLinks[current];
      var thumb = link.querySelector('img');
      var cap = link.querySelector('.pg-cap');
      lbImg.src = link.getAttribute('href');
      lbImg.alt = thumb ? thumb.alt : '';
      lbCap.textContent = cap ? cap.textContent : '';
    }
    /* שאר העמוד מנוטרל כשהלייטבוקס פתוח, אחרת Tab יוצא ממנו אל
       התוכן שמאחור והמשתמש מאבד את ההקשר. */
    function outsideParts() {
      return Array.prototype.slice.call(document.querySelectorAll('header, main, footer, .a11y-fab, .a11y-panel, .whatsapp-fab'));
    }
    function setOutsideHidden(on) {
      outsideParts().forEach(function (el) {
        if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
        else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
      });
    }
    function openLb(i, trigger) {
      lastFocus = trigger || document.activeElement;
      showAt(i);
      lb.hidden = false;
      document.body.classList.add('lb-open');
      setOutsideHidden(true);
      lb.querySelector('.lb-close').focus();
    }
    function closeLb() {
      lb.hidden = true;
      document.body.classList.remove('lb-open');
      setOutsideHidden(false);
      lbImg.src = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    galleryLinks.forEach(function (link, i) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openLb(i, link);
      });
    });
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', function () { showAt(current - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { showAt(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') showAt(current + 1);  /* RTL: שמאלה = הבאה */
      else if (e.key === 'ArrowRight') showAt(current - 1);
      else if (e.key === 'Tab') {
        var focusables = lb.querySelectorAll('button');
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
})();
