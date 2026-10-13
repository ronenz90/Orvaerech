(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var D = window.DriveUtil;
  var data = null, dirty = false, LS = "naama_admin_gh";

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

  /* ---------- general fields ---------- */
  function bindGeneral() {
    document.querySelectorAll("[data-bind]").forEach(function (i) {
      i.value = getPath(data, i.dataset.bind) || "";
      if (i.hasAttribute("data-url")) paintUrl(i);
      i.oninput = function () {
        setPath(data, i.dataset.bind, i.value);
        if (i.hasAttribute("data-url")) paintUrl(i);
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
    msg("הקובץ ירד. כדי לעדכן את האתר ידנית – מחליפים אותו ב-data/site.json בריפוזיטורי.", "ok");
  };

  /* ---------- GitHub ---------- */
  function guess() {
    var h = location.hostname, o = "", r = "";
    if (/\.github\.io$/.test(h)) { o = h.split(".")[0]; r = location.pathname.split("/")[1] || (o + ".github.io"); }
    return { owner: o, repo: r, branch: "main", path: "data/site.json", token: "" };
  }
  function loadCfg() {
    var c = guess();
    try { var s = JSON.parse(localStorage.getItem(LS) || "null"); if (s) Object.keys(s).forEach(function (k) { if (s[k]) c[k] = s[k]; }); } catch (e) {}
    return c;
  }
  function saveCfg(c) { try { localStorage.setItem(LS, JSON.stringify(c)); } catch (e) {} }
  function formCfg() {
    return { owner: $("gh-owner").value.trim(), repo: $("gh-repo").value.trim(), branch: $("gh-branch").value.trim() || "main",
             path: $("gh-path").value.trim().replace(/^\/+/, "") || "data/site.json", token: $("gh-token").value.trim() };
  }
  function fillForm(c) { $("gh-owner").value = c.owner; $("gh-repo").value = c.repo; $("gh-branch").value = c.branch; $("gh-path").value = c.path; $("gh-token").value = c.token; }
  function headers(c) { return { Authorization: "Bearer " + c.token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }; }
  function api(c) { return "https://api.github.com/repos/" + encodeURIComponent(c.owner) + "/" + encodeURIComponent(c.repo) + "/contents/" + c.path.split("/").map(encodeURIComponent).join("/"); }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function explain(status) {
    if (status === 401) return "ה-Token לא תקין או שפג תוקפו.";
    if (status === 403) return "אין הרשאה. ודאו שה-Token כולל Contents: Read and write לריפוזיטורי הזה.";
    if (status === 404) return "הריפוזיטורי או הענף לא נמצאו (או שאין ל-Token גישה אליהם). בדקו שם משתמש, שם ריפוזיטורי וענף.";
    if (status === 409 || status === 422) return "הקובץ השתנה בינתיים בצד השרת. טענו מחדש את הדף ונסו שוב.";
    return "שגיאה " + status;
  }
  function needCfg(c) { return !(c.owner && c.repo && c.token); }

  function openSettings() { fillForm(loadCfg()); msg("", "", "gh-msg"); $("dlg-settings").showModal(); }
  $("btn-settings").onclick = openSettings;
  $("gh-ok").onclick = function () { saveCfg(formCfg()); };
  $("gh-forget").onclick = function () { try { localStorage.removeItem(LS); } catch (e) {} fillForm(guess()); msg("ה-Token נמחק מהדפדפן.", "ok", "gh-msg"); };
  $("gh-test").onclick = function () {
    var c = formCfg();
    if (needCfg(c)) { msg("יש למלא שם משתמש, ריפוזיטורי ו-Token.", "err", "gh-msg"); return; }
    msg("בודק…", "", "gh-msg");
    fetch(api(c) + "?ref=" + encodeURIComponent(c.branch), { headers: headers(c) }).then(function (r) {
      if (r.ok) msg("החיבור תקין – הקובץ נמצא בריפוזיטורי.", "ok", "gh-msg");
      else if (r.status === 404) msg("החיבור עובד, אבל הקובץ " + c.path + " עדיין לא קיים בריפוזיטורי. הוא ייווצר בשמירה הראשונה (אם הריפוזיטורי והענף קיימים).", "", "gh-msg");
      else msg(explain(r.status), "err", "gh-msg");
    }).catch(function () { msg("אין חיבור לרשת.", "err", "gh-msg"); });
  };

  $("btn-save").onclick = function () {
    var bad = badUrls();
    if (bad.length && !confirm("יש " + bad.length + " קישורים לא תקינים. לשמור בכל זאת?")) return;
    var c = loadCfg();
    if (needCfg(c)) { openSettings(); msg("כדי לשמור באתר יש להגדיר חיבור ל-GitHub (או להוריד את site.json).", "", "msg"); return; }
    var b = $("btn-save"); b.disabled = true; b.textContent = "שומר…";
    var done = function () { b.disabled = false; b.textContent = "שמירה באתר"; };
    fetch(api(c) + "?ref=" + encodeURIComponent(c.branch), { headers: headers(c), cache: "no-store" })
      .then(function (r) {
        if (r.ok) return r.json().then(function (j) { return j.sha; });
        if (r.status === 404) return undefined;
        throw { status: r.status };
      })
      .then(function (sha) {
        var body = { message: "עדכון קישורים מדף הניהול", content: b64(toJSON()), branch: c.branch };
        if (sha) body.sha = sha;
        return fetch(api(c), { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, headers(c)), body: JSON.stringify(body) });
      })
      .then(function (r) {
        if (!r.ok) throw { status: r.status };
        setDirty(false);
        msg("נשמר. האתר יתעדכן תוך דקה-שתיים (GitHub Pages בונה מחדש). אם לא רואים שינוי – רענון קשיח (Ctrl+F5).", "ok");
        done();
      })
      .catch(function (e) { msg(e && e.status ? explain(e.status) : "השמירה נכשלה (אין חיבור לרשת?).", "err"); done(); });
  };

  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- load ---------- */
  fetch("data/site.json?v=" + Date.now(), { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { data = d; bindGeneral(); renderBooks(); setDirty(false); })
    .catch(function () {
      $("chip").textContent = "שגיאת טעינה";
      msg("לא ניתן לטעון את data/site.json. ודאו שהדף נפתח דרך האתר (GitHub Pages) ולא ישירות מהמחשב.", "err");
    });
})();
