/* Google Drive / Docs URL -> embeddable URL (shared by the site and the admin page) */
(function (root) {
  "use strict";
  function embed(raw) {
    if (!raw) return null;
    var u;
    try { u = new URL(raw, location.href); } catch (e) { return { src: raw, open: raw }; }
    var h = u.hostname, p = u.pathname, id;
    if (h === "drive.google.com") {
      id = (p.match(/\/folders\/([\w-]+)/) || [])[1];
      if (id) return { src: "https://drive.google.com/embeddedfolderview?id=" + id + "#list", open: raw, kind: "folder" };
      id = (p.match(/\/file\/d\/([\w-]+)/) || [])[1] || u.searchParams.get("id");
      if (id) return { src: "https://drive.google.com/file/d/" + id + "/preview", open: raw, kind: "file" };
    }
    if (h === "docs.google.com") {
      var m = p.match(/^\/(document|spreadsheets|presentation|forms)\/d\/(?:e\/)?([\w-]+)/);
      if (m) {
        if (m[1] === "presentation") return { src: "https://docs.google.com/presentation/d/" + m[2] + "/embed?start=false&loop=false", open: raw, kind: "doc" };
        if (m[1] === "forms") return { src: "https://docs.google.com/forms/d/e/" + m[2] + "/viewform?embedded=true", open: raw, kind: "doc" };
        return { src: "https://docs.google.com/" + m[1] + "/d/" + m[2] + "/preview", open: raw, kind: "doc" };
      }
    }
    return { src: raw, open: raw, kind: "other" };
  }
  function isDrive(raw) {
    try { var h = new URL(raw).hostname; return h === "drive.google.com" || h === "docs.google.com"; } catch (e) { return false; }
  }
  root.DriveUtil = { embed: embed, isDrive: isDrive };
})(window);
