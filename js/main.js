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
    var gal = D.embed(d.gallery.url);
    var gframe = $("gallery-frame");
    gframe.removeAttribute("src");
    if (gal) { gal.src = gal.src.replace("#list", "#grid"); $("gallery-ext").href = gal.open; }
    $("btn-gallery").onclick = function () {
      if (gal) {
        if (!gframe.getAttribute("src")) gframe.setAttribute("src", gal.src);
        open($("dlg-gallery"));
      } else { alert("קישור הגלריה עדיין לא הוגדר."); }
    };

    /* story: Drive link if set, otherwise built-in text */
    $("btn-story").onclick = function () {
      if (d.story.url) { openViewer(d.story.title, d.story.url); return; }
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
        if (r.label && r.url) {
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
    $("loading").remove();
  }

  $("btn-info").addEventListener("click", function () { open($("dlg-info")); });

  fetch("data/site.json?v=" + Date.now(), { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function (e) {
      $("loading").textContent = "לא ניתן לטעון את תוכן האתר. (אם פתחתם את הקובץ ישירות מהמחשב – יש להריץ אותו דרך שרת, או לפרוס ל-GitHub Pages.)";
      if (window.console) console.error(e);
    });
})();
