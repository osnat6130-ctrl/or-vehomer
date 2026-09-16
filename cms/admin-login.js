/* הקוד של דף ההתחברות לפאנל.
 * חייב להיות קובץ חיצוני: מדיניות האבטחה של האתר (CSP) חוסמת
 * סקריפטים שכתובים בתוך ה-HTML. */
(function () {
  var FLAG = 'ov-admin', USER_KEY = 'ov-admin-user', EDIT_KEY = 'ov-editing';
  var form = document.getElementById('login-form');
  var signed = document.getElementById('signed-in');
  var err = document.getElementById('error');
  var submit = document.getElementById('submit');
  var username = document.getElementById('username');
  try { username.value = localStorage.getItem(USER_KEY) || ''; } catch (e) {}

  function showSigned(name) {
    document.getElementById('me-name').textContent = name;
    form.hidden = true;
    signed.hidden = false;
  }

  /* כבר מחוברת ("זכור אותי")? */
  try {
    if (localStorage.getItem(FLAG) === '1') {
      fetch('/api/me', { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) { localStorage.removeItem(FLAG); return; }
        return r.json().then(function (m) { showSigned(m.name); });
      }).catch(function () {});
    }
  } catch (e) {}

  document.getElementById('start-edit').addEventListener('click', function () {
    try { sessionStorage.setItem(EDIT_KEY, '1'); } catch (e) {}
  });
  document.getElementById('logout').addEventListener('click', function (e) {
    e.preventDefault();
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () {
      try { localStorage.removeItem(FLAG); } catch (e) {}
      location.reload();
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    submit.disabled = true;
    submit.textContent = 'רגע...';
    var remember = document.getElementById('remember').checked;
    fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: document.getElementById('password').value, remember: remember })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || ('שגיאה ' + r.status));
        try {
          if (remember) localStorage.setItem(USER_KEY, username.value); else localStorage.removeItem(USER_KEY);
          localStorage.setItem(FLAG, '1');
          sessionStorage.setItem(EDIT_KEY, '1');
        } catch (e) {}
        location.href = '/';
      });
    }).catch(function (ex) {
      err.textContent = ex.message || 'הכניסה נכשלה';
      err.hidden = false;
    }).finally(function () {
      submit.disabled = false;
      submit.textContent = 'כניסה';
    });
  });
})();
