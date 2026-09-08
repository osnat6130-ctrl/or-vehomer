(function () {
  var root = document.documentElement;

  var navToggle = document.querySelector('.nav-toggle');
  var navMenu = document.getElementById('nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      var open = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
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
})();
