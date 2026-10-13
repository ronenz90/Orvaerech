(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var D = window.DriveUtil;
  var data = null, dirty = false, PWKEY = "naama_admin_pw", pass = "";

  /* ---------- helpers ---------- */
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function getPath(o, p) { return p.split(".").reduce(function (a, k) { return a == null ? "" : a[k]; }, o); }
  function setPath(o, p, v) { var ks = p.split("."), last = ks.pop(); ks.reduce(function (a, k) { return a[k]; }, o)[last] = v; }
  function setDirty(v) {
    dirty = v;
    var c = $("chip");
    c.textContent = v ? "יש שינויים שלא נשמרו" : "הכול שמור";
    c.className = "chip " + (v ? "dirty" : "saved");
  }
  function msg(text, kind, target) {
    var m = $(target || "msg");
    if (!text) { m.hidden = true; return; }
    m.textContent = text; m.className = "note " + (kind || ""); m.hidden = false;
  }
  function urlState(v) {                       // "", "ok", "warn", "bad"
    v = (v || "").trim();
    if (!v) return { s: "", k: "" };
    var u; try { u = new URL(v); } catch (e) { return { s: "bad", k: "קישור לא תקין" }; }
    if (u.protocol !== "https:" && u.protocol !== "http:") return { s: "bad", k: "קישור לא תקין" };
    if (!D.isDrive(v)) return { s: "warn", k: "לא קישור Drive – ייפתח כפי שהוא" };
    var e = D.embed(v);
    return { s: "ok", k: e.kind === "folder" ? "תיקייה" : e.kind === "file" ? "קובץ" : "מסמך" };
  }
  function paintUrl(input, kindEl) {
    var st = urlState(input.value);
    input.classList.toggle("bad", st.s === "bad");
    input.classList.toggle("warn", st.s === "warn");
    if (kindEl) kindEl.textContent = st.k;
  }

  function paintFeed(input) {
    var v = input.value.trim(), bad = false, warn = false;
    if (v) { try { var u = new URL(v); bad = u.protocol !== "https:"; warn = !/^script\.google(usercontent)?\.com$/.test(u.hostname); } catch (e) { bad = true; } }
    input.classList.toggle("bad", bad); input.classList.toggle("warn", !bad && warn);
  }

  /* ---------- general fields ---------- */
  function bindGeneral() {
    document.querySelectorAll("[data-bind]").forEach(function (i) {
      i.value = getPath(data, i.dataset.bind) || "";
      if (i.hasAttribute("data-url")) paintUrl(i);
      if (i.hasAttribute("data-feed")) paintFeed(i);
      i.oninput = function () {
        setPath(data, i.dataset.bind, i.value);
        if (i.hasAttribute("data-url")) paintUrl(i);
        if (i.hasAttribute("data-feed")) paintFeed(i);
        setDirty(true);
      };
    });
  }

  /* ---------- books / rows ---------- */
  function renderBooks() {
    var box = $("books"); box.textContent = "";
    data.books.forEach(function (b, bi) {
      var card = el("section", "card");
      var head = el("div", "book-head");
      var t = el("input"); t.value = b.title; t.setAttribute("aria-label", "שם הספר");
      t.oninput = function () { b.title = t.value; setDirty(true); };
      head.appendChild(t);
      head.appendChild(btn("↑", "העלאה", function () { move(data.books, bi, -1); }, bi === 0));
      head.appendChild(btn("↓", "הורדה", function () { move(data.books, bi, 1); }, bi === data.books.length - 1));
      head.appendChild(btn("מחיקת הספר", "", function () {
        if (confirm("למחוק את \"" + b.title + "\" וכל השורות שבו?")) { data.books.splice(bi, 1); setDirty(true); renderBooks(); }
      }, false, "danger"));
      card.appendChild(head);

      var tbl = el("table");
      var th = el("thead"), tr0 = el("tr");
      ["פרשה", "מקף", "טקסט הקישור", "קישור Drive", ""].forEach(function (h) { tr0.appendChild(el("th", null, h)); });
      th.appendChild(tr0); tbl.appendChild(th);
      var tb = el("tbody");
      b.rows.forEach(function (r, ri) { tb.appendChild(rowEl(b, r, ri)); });
      tbl.appendChild(tb); card.appendChild(tbl);

      var add = btn("+ הוספת שורה", "", function () {
        b.rows.push({ name: "", dash: true, label: "", url: "" }); setDirty(true); renderBooks();
        var ins = $("books").querySelectorAll("section")[bi].querySelectorAll("tbody tr");
        var f = ins[ins.length - 1].querySelector("input"); if (f) f.focus();
      });
      add.style.marginTop = "8px"; card.appendChild(add);
      box.appendChild(card);
    });
  }

  function btn(text, title, fn, disabled, cls) {
    var b = el("button", "btn small " + (cls || ""), text); b.type = "button";
    if (title) b.title = title; if (disabled) b.disabled = true; b.onclick = fn; return b;
  }
  function move(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return; var x = arr.splice(i, 1)[0]; arr.splice(j, 0, x); setDirty(true); renderBooks(); }

  function rowEl(b, r, ri) {
    var tr = el("tr");
    var nm = el("td", "nm"), i1 = el("input"); i1.value = r.name; i1.placeholder = "פרשה"; i1.oninput = function () { r.name = i1.value; setDirty(true); }; nm.appendChild(i1);
    var ds = el("td", "dsh"), cb = el("input"); cb.type = "checkbox"; cb.checked = !!r.dash; cb.title = "מקף בין הפרשה לקישור"; cb.onchange = function () { r.dash = cb.checked; setDirty(true); }; ds.appendChild(cb);
    var lb = el("td", "lb"), i2 = el("input"); i2.value = r.label; i2.placeholder = "אור …"; i2.oninput = function () { r.label = i2.value; setDirty(true); }; lb.appendChild(i2);
    var ur = el("td", "ur"), i3 = el("input"); i3.value = r.url; i3.dir = "ltr"; i3.placeholder = "https://drive.google.com/…";
    var kind = el("span", "kind"); i3.oninput = function () { r.url = i3.value.trim(); paintUrl(i3, kind); setDirty(true); };
    paintUrl(i3, kind); ur.appendChild(i3); ur.appendChild(kind);
    var ac = el("td", "ac");
    ac.appendChild(btn("↑", "העלאה", function () { move(b.rows, ri, -1); }, ri === 0));
    ac.appendChild(btn("↓", "הורדה", function () { move(b.rows, ri, 1); }, ri === b.rows.length - 1));
    var test = el("a", "btn small", "בדיקה ↗"); test.target = "_blank"; test.rel = "noopener";
    test.href = "#"; test.onclick = function (e) { if (!i3.value.trim()) { e.preventDefault(); return; } test.href = i3.value.trim(); };
    ac.appendChild(test);
    ac.appendChild(btn("✕", "מחיקת שורה", function () { b.rows.splice(ri, 1); setDirty(true); renderBooks(); }, false, "danger"));
    [nm, ds, lb, ur, ac].forEach(function (c) { tr.appendChild(c); });
    return tr;
  }

  $("btn-add-book").onclick = function () {
    data.books.push({ title: "קבוצה חדשה", rows: [{ name: "", dash: true, label: "", url: "" }] });
    setDirty(true); renderBooks();
  };

  /* ---------- JSON ---------- */
  function clean() {
    var out = JSON.parse(JSON.stringify(data));
    out.books.forEach(function (b) { b.rows = b.rows.filter(function (r) { return r.name.trim() || r.label.trim() || r.url.trim(); }); });
    return out;
  }
  function toJSON() { return JSON.stringify(clean(), null, 2) + "\n"; }
  function allUrls() {
    var d = clean(), list = [d.gallery.url, d.story.url];
    d.books.forEach(function (b) { b.rows.forEach(function (r) { list.push(r.url); }); });
    return list.filter(Boolean);
  }
  function badUrls() { return allUrls().filter(function (u) { return urlState(u).s === "bad"; }); }

  $("btn-download").onclick = function () {
    var a = el("a"); a.href = URL.createObjectURL(new Blob([toJSON()], { type: "application/json" }));
    a.download = "site.json"; document.body.appendChild(a); a.click(); a.remove();
    msg('הגיבוי ירד למכשיר. האתר עצמו מתעדכן רק בלחיצה על "שמירה".', "ok");
  };

  /* ---------- server ---------- */
  var API = window.SITE_API;
  function call(body) {
    return fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  var ERR = {
    bad_password: "הסיסמה שגויה.",
    locked: "יותר מדי ניסיונות שגויים. הכניסה נחסמה זמנית – נסו שוב בעוד כ-15 דקות.",
    not_configured: "לא הוגדרה סיסמה בשרת. יש להוסיף Script Property בשם ADMIN_PASSWORD ב-Apps Script ולפרסם גרסה חדשה.",
    bad_request: "הבקשה לא הובנה בשרת. ודאו שב-Apps Script מודבק הקוד העדכני (backend.gs) ופורסמה גרסה חדשה.",
    invalid_data: "השרת דחה את הנתונים"
  };
  function errText(r) { return (ERR[r && r.error] || "שגיאה בשרת") + (r && r.detail ? " (" + r.detail + ")" : ""); }

  function stored() { try { return localStorage.getItem(PWKEY) || sessionStorage.getItem(PWKEY) || ""; } catch (e) { return ""; } }
  function isRemembered() { try { return !!localStorage.getItem(PWKEY); } catch (e) { return false; } }
  function store(pw, remember) {
    try { localStorage.removeItem(PWKEY); sessionStorage.removeItem(PWKEY); (remember ? localStorage : sessionStorage).setItem(PWKEY, pw); } catch (e) {}
  }
  function forget() { try { localStorage.removeItem(PWKEY); sessionStorage.removeItem(PWKEY); } catch (e) {} }

  function loginMsg(t) { var m = $("login-msg"); m.textContent = t || ""; m.hidden = !t; }
  function showLogin(t) { pass = ""; $("app").hidden = true; $("login").hidden = false; loginMsg(t); $("pw").focus(); }

  function loadData() {
    return fetch(API + "?action=site&v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok && j.data && j.data.books) return { d: j.data, fromServer: true };
        throw new Error("empty");
      })
      .catch(function () {
        return fetch("data/site.json?v=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.json(); })
          .then(function (d) { return { d: d, fromServer: false }; });
      });
  }
  function enter() {
    return loadData().then(function (x) {
      data = x.d;
      ["gallery", "story", "info", "footer"].forEach(function (k) { if (!data[k]) data[k] = {}; });
      $("login").hidden = true; $("app").hidden = false;
      bindGeneral(); renderBooks();
      if (x.fromServer) { setDirty(false); msg("", ""); }
      else { setDirty(true); msg("הנתונים נטענו מהקובץ המקורי. לחצו \"שמירה\" פעם אחת כדי להעביר אותם לשרת – מכאן והלאה העריכה לא תדרוש עדכון ריפוזיטורי.", ""); }
    });
  }

  if (!API) { loginMsg("לא הוגדר SITE_API בקובץ js/config.js."); $("login-btn").disabled = true; }

  function tryLogin(pw, remember, silent) {
    $("login-btn").disabled = true; $("login-btn").textContent = "בודק…";
    return call({ action: "login", password: pw })
      .then(function (r) {
        if (r && r.ok) { pass = pw; store(pw, remember); return enter(); }
        forget(); showLogin(silent ? "" : errText(r));
      })
      .catch(function () { showLogin("אין חיבור לשרת. בדקו את הרשת ואת כתובת SITE_API."); })
      .then(function () { $("login-btn").disabled = false; $("login-btn").textContent = "כניסה"; });
  }
  $("login-form").onsubmit = function (e) { e.preventDefault(); loginMsg(""); tryLogin($("pw").value, $("remember").checked, false); };
  $("btn-logout").onclick = function () {
    if (dirty && !confirm("יש שינויים שלא נשמרו. לצאת בכל זאת?")) return;
    dirty = false; forget(); $("pw").value = ""; showLogin("");
  };

  $("btn-save").onclick = function () {
    var bad = badUrls();
    if (bad.length && !confirm("יש " + bad.length + " קישורים לא תקינים. לשמור בכל זאת?")) return;
    var b = $("btn-save"); b.disabled = true; b.textContent = "שומר…";
    var done = function () { b.disabled = false; b.textContent = "שמירה"; };
    call({ action: "save", password: pass, data: clean() })
      .then(function (r) {
        if (r && r.ok) { setDirty(false); msg("נשמר. האתר מתעדכן מיד אצל מי שפותח אותו מעכשיו (מי שכבר פתוח אצלו יראה בטעינה הבאה).", "ok"); }
        else if (r && (r.error === "bad_password" || r.error === "locked")) { dirty = false; forget(); showLogin(errText(r)); }
        else msg(errText(r), "err");
      })
      .catch(function () { msg("השמירה נכשלה – אין חיבור לשרת. השינויים עדיין כאן, נסו שוב.", "err"); })
      .then(done);
  };

  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* auto-login if a password was remembered on this device / tab */
  var saved = stored();
  if (API && saved) tryLogin(saved, isRemembered(), true);
})();
