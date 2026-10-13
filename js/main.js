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

  function render(d) {
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

    /* books */
    var box = $("books"); box.textContent = "";
    d.books.forEach(function (b) {
      var sec = el("section", "book");
      sec.appendChild(el("h2", null, b.title));
      b.rows.forEach(function (r) {
        var row = el("div", "row");
        row.appendChild(el("span", "name", r.name + (r.dash && r.label ? " -" : "")));
        var lbl = el("span", "lbl");
        if (r.label && /^https?:\/\//i.test(r.url || "")) {
          var a = el("a", null, r.label);
          a.href = r.url; a.rel = "noopener";
          a.addEventListener("click", function (ev) {
            if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button) return;
            ev.preventDefault(); openViewer(r.label, r.url);
          });
          lbl.appendChild(a);
        } else if (r.label) { lbl.textContent = r.label; }
        row.appendChild(lbl);
        sec.appendChild(row);
      });
      box.appendChild(sec);
    });

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
