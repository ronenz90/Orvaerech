/**
 * שרת קטן לאתר "אור וערך לנעמה" – Google Apps Script.
 * עושה שלושה דברים:
 *  1. שומר את תוכן האתר (שורות, קישורים, טקסטים) בקובץ ב-Drive שלכם, כך ששינוי לא דורש לגעת בריפוזיטורי.
 *  2. מאפשר שמירה רק למי שיודע את סיסמת הניהול. הסיסמה נשמרת כ"סוד" ב-Script Properties ואינה מופיעה בקוד.
 *  3. מזין את הגלריה: רשימת כל התמונות בתיקייה ובכל תיקיות המשנה.
 *
 * התקנה / עדכון:
 *  א. בפרויקט ה-Apps Script הקיים: מוחקים את הקוד הישן ומדביקים את כל הקובץ הזה ← שמירה.
 *  ב. הגדרת הסיסמה (הסוד): סמל גלגל השיניים "Project Settings" ← למטה "Script Properties" ← "Add script property"
 *     Property: ADMIN_PASSWORD   Value: הסיסמה שבחרתם   ← Save.
 *  ג. Deploy ← Manage deployments ← סמל העיפרון ← Version: "New version" ← Deploy.
 *     (חשוב: בלי "New version" הקוד הישן ממשיך לרוץ. כתובת ה-/exec נשארת אותה כתובת.)
 *  ד. בפעם הראשונה ייתכן שיבקשו אישור הרשאות – מאשרים.
 */

const FOLDER_ID = '16m87owSSRfjEpgxak8I286BvqwfnTH57';   // תיקיית התמונות של הגלריה
const DATA_FILE_NAME = 'naama-site-data.json';           // הקובץ שנוצר ב-My Drive ומחזיק את תוכן האתר
const MAX_FAILS = 8;                                     // ניסיונות סיסמה שגויים לפני חסימה
const LOCK_SECONDS = 900;                                // משך החסימה (15 דקות)

/* ============ נקודות כניסה ============ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'site') return out_({ ok: true, data: readSite_() });
  return gallery_(p);
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return out_({ ok: false, error: 'bad_request' }); }

  const auth = checkPassword_(req.password);
  if (auth !== 'ok') return out_({ ok: false, error: auth });

  if (req.action === 'login') return out_({ ok: true });

  if (req.action === 'save') {
    let clean;
    try { clean = sanitize_(req.data); }
    catch (err) { return out_({ ok: false, error: 'invalid_data', detail: String(err) }); }
    writeSite_(clean);
    return out_({ ok: true });
  }
  return out_({ ok: false, error: 'bad_request' });
}

/* ============ סיסמה ============ */

function checkPassword_(given) {
  const secret = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!secret) return 'not_configured';
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= MAX_FAILS) return 'locked';
  if (safeEqual_(String(given == null ? '' : given), secret)) {
    cache.remove('fails');
    return 'ok';
  }
  cache.put('fails', String(fails + 1), LOCK_SECONDS);
  Utilities.sleep(800);
  return 'bad_password';
}

function safeEqual_(a, b) {
  const n = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/* ============ אחסון תוכן האתר ============ */

function readSite_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('site');
  if (hit) return JSON.parse(hit);
  const id = PropertiesService.getScriptProperties().getProperty('DATA_FILE_ID');
  if (!id) return null;
  try {
    const text = DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
    const data = JSON.parse(text);
    if (text.length < 90000) cache.put('site', text, 300);
    return data;
  } catch (err) {
    return null;
  }
}

function writeSite_(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getScriptProperties();
    const text = JSON.stringify(data);
    let file = null;
    const id = props.getProperty('DATA_FILE_ID');
    if (id) { try { file = DriveApp.getFileById(id); } catch (err) { file = null; } }
    if (file) file.setContent(text);
    else props.setProperty('DATA_FILE_ID', DriveApp.createFile(DATA_FILE_NAME, text, 'text/plain').getId());
    CacheService.getScriptCache().remove('site');
  } finally {
    lock.releaseLock();
  }
}

/* ============ ולידציה – נשמר רק מה שמוכר ============ */

function str_(v, max, name) {
  if (v == null) return '';
  if (typeof v !== 'string') throw name + ' must be text';
  if (v.length > max) throw name + ' too long';
  return v;
}
function url_(v, name) {
  const s = str_(v, 600, name).trim();
  if (s && !/^https:\/\//i.test(s)) throw name + ' must start with https://';
  return s;
}

function sanitize_(d) {
  if (!d || typeof d !== 'object') throw 'no data';
  if (!Array.isArray(d.books) || d.books.length > 40) throw 'books';
  const g = d.gallery || {}, s = d.story || {}, i = d.info || {}, f = d.footer || {};
  const clean = {
    version: 1,
    info: { title: str_(i.title, 100, 'info.title'), text: str_(i.text, 8000, 'info.text') },
    gallery: { title: str_(g.title, 100, 'gallery.title'), subtitle: str_(g.subtitle, 100, 'gallery.subtitle'),
               url: url_(g.url, 'gallery.url'), feed: url_(g.feed, 'gallery.feed') },
    story: { title: str_(s.title, 100, 'story.title'), subtitle: str_(s.subtitle, 150, 'story.subtitle'), url: url_(s.url, 'story.url') },
    books: d.books.map(function (b, bi) {
      if (!b || !Array.isArray(b.rows) || b.rows.length > 300) throw 'book ' + bi;
      return {
        title: str_(b.title, 100, 'book.title'),
        rows: b.rows.map(function (r) {
          return { name: str_(r.name, 100, 'row.name'), dash: !!r.dash, label: str_(r.label, 150, 'row.label'), url: url_(r.url, 'row.url') };
        })
      };
    }),
    footer: { line1: str_(f.line1, 300, 'footer.line1'), line2: str_(f.line2, 300, 'footer.line2') }
  };
  if (JSON.stringify(clean).length > 200000) throw 'too large';
  return clean;
}

/* ============ גלריה ============ */

function gallery_(p) {
  const cache = CacheService.getScriptCache();
  if (!p.refresh) {
    const hit = cache.get('gallery');
    if (hit) return json_(hit);
  }
  const sections = [];
  walk_(DriveApp.getFolderById(FOLDER_ID), '', sections);
  const text = JSON.stringify({
    updated: new Date().toISOString(),
    sections: sections.filter(function (s) { return s.images.length > 0; })
  });
  if (text.length < 90000) cache.put('gallery', text, 600);
  return json_(text);
}

function byName_(a, b) { return a.name.localeCompare(b.name, 'he', { numeric: true }); }

function walk_(folder, path, sections) {
  const images = [];
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (String(f.getMimeType()).indexOf('image/') === 0) images.push({ id: f.getId(), name: f.getName() });
  }
  images.sort(byName_);
  sections.push({ name: path, images: images });
  const subs = [];
  const it = folder.getFolders();
  while (it.hasNext()) { const s = it.next(); subs.push({ name: s.getName(), folder: s }); }
  subs.sort(byName_);
  subs.forEach(function (s) { walk_(s.folder, path ? path + ' / ' + s.name : s.name, sections); });
}

/* ============ פלט ============ */

function json_(text) { return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON); }
function out_(obj) { return json_(JSON.stringify(obj)); }
