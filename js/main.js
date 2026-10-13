(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var D = window.DriveUtil;

  /* ---------- modals ---------- */
  document.querySelectorAll("dialog.modal").forEach(function (d) {
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
    d.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { d.close(); }); });
  });
  function open(d) { if (!d.open) d.showModal(); }

  var viewer = $("dlg-viewer"), vFrame = $("viewer-frame");
  viewer.addEventListener("close", function () { vFrame.removeAttribute("src"); });
  function openViewer(title, url) {
    var e = D.embed(url);
    if (!e) return;
    $("viewer-title").textContent = title || "";
    $("viewer-ext").href = e.open;
    vFrame.setAttribute("src", e.src);
    open(viewer);
  }


  /* ---------- gallery ---------- */
  var galLoaded = false, items = [], cur = 0;
  function thumb(id, w) { return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w" + w; }

  function showEmbed(g) {
    var e = D.embed(g.url), f = $("gallery-frame");
    $("gallery-view").hidden = true; f.hidden = false;
    if (e) { e.src = e.src.replace("#list", "#grid"); $("gallery-ext").href = e.open; if (!f.getAttribute("src")) f.setAttribute("src", e.src); }
  }
  function openGallery(g) {
    open($("dlg-gallery"));
    if (g.url) { var e = D.embed(g.url); if (e) $("gallery-ext").href = e.open; }
    var feed = g.feed || window.SITE_API;
    if (!feed) { showEmbed(g); return; }
    var view = $("gallery-view");
    $("gallery-frame").hidden = true; view.hidden = false;
    if (galLoaded) return;
    view.textContent = "";
    view.appendChild(el("p", "gal-msg", "טוען תמונות…"));
    fetch(feed + (feed.indexOf("?") > -1 ? "&" : "?") + "v=" + Math.floor(Date.now() / 60000))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { buildGallery(view, data); galLoaded = true; })
      .catch(function () {
        view.hidden = true; showEmbed(g);
      });
  }
  function buildGallery(view, data) {
    view.textContent = ""; items = [];
    (data.sections || []).forEach(function (sec) {
      if (!sec.images || !sec.images.length) return;
      if (sec.name) view.appendChild(el("h3", "gal-h", sec.name));
      var grid = el("div", "gal-grid");
      sec.images.forEach(function (im) {
        var idx = items.push(im) - 1;
        var b = el("button", "gal-t"); b.type = "button"; b.setAttribute("aria-label", "הגדלת תמונה " + (idx + 1));
        var img = el("img"); img.loading = "lazy"; img.decoding = "async"; img.alt = ""; img.src = thumb(im.id, 400);
        img.onerror = function () { b.classList.add("broken"); };
        b.appendChild(img); b.onclick = function () { showLight(idx); };
        grid.appendChild(b);
      });
      view.appendChild(grid);
    });
    if (!items.length) view.appendChild(el("p", "gal-msg", "אין עדיין תמונות בגלריה."));
  }

  /* lightbox */
  var light = $("dlg-light"), limg = $("light-img");
  function showLight(i) {
    if (!items.length) return;
    cur = (i + items.length) % items.length;
    var im = items[cur];
    limg.classList.add("loading");
    limg.onload = function () { limg.classList.remove("loading"); };
    limg.src = thumb(im.id, 1600);
    $("light-count").textContent = (cur + 1) + " / " + items.length;
    $("light-ext").href = "https://drive.google.com/file/d/" + encodeURIComponent(im.id) + "/view";
    [cur + 1, cur - 1].forEach(function (j) { var n = items[(j + items.length) % items.length]; if (n) new Image().src = thumb(n.id, 1600); });
    if (!light.open) light.showModal();
  }
  $("light-close").onclick = function () { light.close(); };
  $("light-next").onclick = function () { showLight(cur + 1); };
  $("light-prev").onclick = function () { showLight(cur - 1); };
  light.addEventListener("click", function (e) { if (e.target === light) light.close(); });
  light.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") showLight(cur + 1);          /* RTL: left = forward */
    else if (e.key === "ArrowRight") showLight(cur - 1);
  });
  var sx = null;
  light.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  light.addEventListener("touchend", function (e) {
    if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 45) showLight(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- render from data/site.json ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- letters ---------- */
  var wStatic = [], wRemote = [];
  function renderLetters() {
    var box = $("writes-list"); box.textContent = "";
    var all = wRemote.concat(wStatic);
    if (!all.length) box.appendChild(el("p", "empty", "עדיין אין מכתבים. אפשר להיות הראשונים."));
    all.forEach(function (m) {
      var c = el("article", "msg");
      if (m.name) c.appendChild(el("h3", null, m.name));
      if (m.text) c.appendChild(el("p", null, m.text));
      box.appendChild(c);
    });
  }
  function loadLetters() {
    var api = window.SITE_API; if (!api) return;
    fetch(api + "?action=letters&v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok && Array.isArray(j.items)) { wRemote = j.items; renderLetters(); } })
      .catch(function () {});
  }
  var compose = $("compose"), wMsg = $("w-msg");
  function wsay(t, err) { wMsg.textContent = t || ""; wMsg.className = "w-msg" + (err ? " err" : ""); wMsg.hidden = !t; }
  $("btn-writes").addEventListener("click", function () { open($("dlg-writes")); $("dlg-writes").querySelector(".modal-body").scrollTop = 0; loadLetters(); });
  $("btn-compose").addEventListener("click", function () { compose.hidden = false; $("btn-compose").hidden = true; wsay(""); $("w-done").hidden = true; $("w-name").focus(); });
  $("w-cancel").addEventListener("click", function () { compose.hidden = true; $("btn-compose").hidden = false; wsay(""); });
  compose.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = $("w-text").value.trim();
    if (!text) { wsay("יש לכתוב את תוכן המכתב.", true); return; }
    var api = window.SITE_API; if (!api) { wsay("לא ניתן לשלוח כרגע.", true); return; }
    var b = $("w-send"); b.disabled = true; b.textContent = "שולח…";
    fetch(api, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "submit", name: $("w-name").value.trim(), text: text, hp: $("w-hp").value }) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (r && r.ok) {
          $("w-text").value = ""; compose.hidden = true; $("btn-compose").hidden = false; wsay("");
          var dn = $("w-done"); dn.textContent = r.status === "published" ? "תודה! המכתב פורסם." : "תודה! המכתב התקבל ויופיע לאחר אישור."; dn.hidden = false;
          if (r.status === "published") loadLetters();
        } else {
          var m = { too_long: "המכתב ארוך מדי.", busy: "יותר מדי מכתבים נשלחו עכשיו. נסו שוב מאוחר יותר.", full: "אין כרגע אפשרות לקבל מכתבים נוספים." };
          wsay(m[r && r.error] || "השליחה נכשלה. נסו שוב.", true);
        }
      })
      .catch(function () { wsay("השליחה נכשלה. בדקו את החיבור ונסו שוב.", true); })
      .then(function () { b.disabled = false; b.textContent = "שליחה"; });
  });

  function makeBook(group, title, cnt, isOpen, fill) {
    var sec = el("section", "book" + (isOpen ? " open" : ""));
    var head = el("button", "head");
    head.type = "button";
    head.setAttribute("aria-expanded", isOpen ? "true" : "false");
    head.appendChild(el("span", "bt", title));
    if (cnt) head.appendChild(el("span", "cnt", cnt));
    var chev = el("span", "chev", "\u2304"); chev.setAttribute("aria-hidden", "true");
    head.appendChild(chev);
    head.addEventListener("click", function () {
      var was = sec.classList.contains("open");
      group.querySelectorAll(".book").forEach(function (x) {
        x.classList.remove("open"); x.firstChild.setAttribute("aria-expanded", "false");
      });
      if (!was) {
        sec.classList.add("open"); head.setAttribute("aria-expanded", "true");
        setTimeout(function () { sec.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 360);
      }
    });
    var panel = el("div", "panel"), inner = el("div"), ul = el("ul", "list");
    fill(ul);
    inner.appendChild(ul); panel.appendChild(inner);
    sec.appendChild(head); sec.appendChild(panel);
    return sec;
  }

  function render(d) {
    SiteDefaults.fill(d);
    /* banners */
    $("gallery-title").textContent = d.gallery.title;
    $("gallery-sub").textContent = d.gallery.subtitle || "";
    $("gallery-head").textContent = d.gallery.title;
    $("story-title").textContent = d.story.title;
    $("story-sub").textContent = d.story.subtitle || "";
    $("story-head").textContent = d.story.title;

    /* info */
    $("info-head").textContent = d.info.title || "מידע על האתר";
    var info = $("info-text"); info.textContent = "";
    String(d.info.text || "").split(/\n{2,}/).forEach(function (t) { if (t.trim()) info.appendChild(el("p", null, t.trim())); });

    /* gallery */
    var gal = d.gallery;
    $("btn-gallery").onclick = function () { openGallery(gal); };

    /* story: Drive link if set, otherwise built-in text */
    $("btn-story").onclick = function () {
      if (/^https?:\/\//i.test(d.story.url || "")) { openViewer(d.story.title, d.story.url); return; }
      open($("dlg-story"));
      $("dlg-story").querySelector(".modal-body").scrollTop = 0;
    };

    /* books: one banner per book, unfolds into the parasha list */
    var box = $("books");
    var openIdx = -1;
    var prev = box.querySelector(".book.open");
    if (prev) openIdx = Number(prev.getAttribute("data-i"));
    box.textContent = "";
    d.books.forEach(function (b, i) {
      var sec = makeBook(box, b.title, b.rows.length + " פרשות", i === openIdx, function (ul) {
        b.rows.forEach(function (r) {
          var li = el("li");
          var linked = r.label && /^https?:\/\//i.test(r.url || "");
          var row = el(linked ? "a" : "div", "li" + (linked ? "" : " soon"));
          row.appendChild(el("span", "pn", r.name));
          row.appendChild(el("span", "dots"));
          row.appendChild(el("span", "lb", linked ? r.label : (r.label || "בקרוב")));
          if (linked) {
            row.appendChild(el("span", "go", "\u2039"));
            row.href = r.url; row.rel = "noopener";
            row.addEventListener("click", function (ev) {
              if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button) return;
              ev.preventDefault(); openViewer(r.label, r.url);
            });
          }
          li.appendChild(row); ul.appendChild(li);
        });
      });
      sec.setAttribute("data-i", i);
      box.appendChild(sec);
    });

    /* news: "מספרים על נעמה" - opens in place, links go to the articles */
    var nbox = $("news");
    var nOpen = !!nbox.querySelector(".book.open");
    nbox.textContent = "";
    var items = (d.news.items || []).filter(function (x) { return x.title || x.url; });
    nbox.appendChild(makeBook(nbox, d.news.title, items.length ? items.length + " כתבות" : "", nOpen, function (ul) {
      if (!items.length) { var e0 = el("li"); e0.appendChild(el("div", "li soon", "עדיין אין כתבות")); ul.appendChild(e0); return; }
      items.forEach(function (x) {
        var li = el("li");
        var ok = /^https?:\/\//i.test(x.url || "");
        var row = el(ok ? "a" : "div", "li art" + (ok ? "" : " soon"));
        var t = el("span", "art-t", x.title || x.url);
        if (x.source) t.appendChild(el("span", "art-s", x.source));
        row.appendChild(t);
        if (ok) { row.appendChild(el("span", "go", "\u2197")); row.href = x.url; row.target = "_blank"; row.rel = "noopener noreferrer"; }
        li.appendChild(row); ul.appendChild(li);
      });
    }));

    /* writes: "כותבים לנעמה" - letters: fixed ones from the data + public ones from the server */
    $("writes-title").textContent = d.writes.title;
    $("writes-head").textContent = d.writes.title;
    wStatic = (d.writes.items || []).filter(function (x) { return x.name || x.text; });
    renderLetters();

    /* video */
    var vid = SiteDefaults.ytId(d.video.url), vbox = $("video");
    if (vid) {
      var cur = vbox.getAttribute("data-id");
      if (cur !== vid) {
        vbox.textContent = "";
        var fr = el("iframe");
        fr.src = "https://www.youtube-nocookie.com/embed/" + vid + "?rel=0";
        fr.title = "סרטון"; fr.loading = "lazy"; fr.allowFullscreen = true;
        fr.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen");
        fr.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        var frame = el("div", "frame"); frame.appendChild(fr); vbox.appendChild(frame);
        vbox.setAttribute("data-id", vid);
      }
      vbox.hidden = false;
    } else { vbox.textContent = ""; vbox.removeAttribute("data-id"); vbox.hidden = true; }

    /* footer */
    $("foot-1").textContent = d.footer.line1;
    $("foot-2").textContent = d.footer.line2;
    var ld = $("loading"); if (ld) ld.remove();
  }

  $("btn-info").addEventListener("click", function () { open($("dlg-info")); });

  /* ---------- data loading: server (Apps Script) first, repo file as fallback ---------- */
  var CKEY = "naama_site_v1", lastJson = null, failed = false;
  function show(d) {
    var s = JSON.stringify(d);
    if (s === lastJson) return;
    lastJson = s; render(d);
  }
  function repoData() {
    return fetch("data/site.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function apiData() {
    var api = window.SITE_API;
    if (!api) return Promise.reject(new Error("no api"));
    return fetch(api + (api.indexOf("?") > -1 ? "&" : "?") + "action=site&v=" + Math.floor(Date.now() / 20000))
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok && j.data && j.data.books) return j.data; throw new Error("empty"); });
  }
  function fromRepo() {
    if (lastJson) return;
    repoData().then(show).catch(function (e) {
      if (lastJson) return;
      $("loading").textContent = "לא ניתן לטעון את תוכן האתר. נסו לרענן את הדף.";
      if (window.console) console.error(e);
    });
  }
  try { var c = JSON.parse(localStorage.getItem(CKEY) || "null"); if (c && c.books) show(c); } catch (e) {}
  var slow = setTimeout(fromRepo, 5000);
  apiData().then(function (d) {
    clearTimeout(slow);
    try { localStorage.setItem(CKEY, JSON.stringify(d)); } catch (e) {}
    show(d);
  }).catch(function () { clearTimeout(slow); fromRepo(); });
})();
