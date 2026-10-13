/* defaults for newer content blocks + YouTube helper (shared by the site and the admin page) */
(function (root) {
  "use strict";
  var DEF_VIDEO = "https://youtu.be/wfXIiDJtex4?feature=shared";

  function ytId(raw) {
    try {
      var u = new URL(String(raw || "").trim()), h = u.hostname.replace(/^(www|m)\./, ""), id = "", m;
      if (h === "youtu.be") id = u.pathname.slice(1).split("/")[0];
      else if (h === "youtube.com" || h === "youtube-nocookie.com") {
        if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
        else { m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/); if (m) id = m[2]; }
      }
      return /^[\w-]{11}$/.test(id) ? id : "";
    } catch (e) { return ""; }
  }

  function fill(d) {
    ["gallery", "story", "info", "footer"].forEach(function (k) { if (!d[k]) d[k] = {}; });
    if (!d.video || typeof d.video.url !== "string") d.video = { url: DEF_VIDEO };
    if (!d.writes) d.writes = {};
    if (typeof d.writes.title !== "string") d.writes.title = "כותבים לנעמה";
    if (typeof d.writes.subtitle !== "string") d.writes.subtitle = "דברים שכתבו אליה ועליה";
    if (!Array.isArray(d.writes.items)) d.writes.items = [];
    if (!d.news) d.news = {};
    if (typeof d.news.title !== "string") d.news.title = "מספרים על נעמה";
    if (typeof d.news.subtitle !== "string") d.news.subtitle = "כתבות וקישורים";
    if (!Array.isArray(d.news.items)) d.news.items = [];
    return d;
  }
  root.SiteDefaults = { fill: fill, ytId: ytId };
})(window);
