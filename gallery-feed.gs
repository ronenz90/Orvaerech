/**
 * מזין הגלריה של האתר "אור וערך לנעמה".
 * מחזיר JSON עם כל התמונות בתיקייה ובכל תיקיות המשנה שלה (גם עמוקות).
 *
 * התקנה (פעם אחת):
 * 1. נכנסים ל-https://script.google.com ← "פרויקט חדש".
 * 2. מוחקים את הקוד שיש ומדביקים את כל הקובץ הזה.
 * 3. בודקים שה-FOLDER_ID למטה הוא מזהה תיקיית התמונות שלכם.
 * 4. לוחצים "פריסה" (Deploy) ← "פריסה חדשה" ← סוג: "אפליקציית אינטרנט" (Web app):
 *      Execute as: Me   |   Who has access: Anyone
 * 5. מאשרים הרשאות (בפעם הראשונה), ומעתיקים את "Web app URL".
 * 6. מדביקים את ה-URL בדף הניהול של האתר בשדה "קישור לסקריפט הגלריה".
 *
 * תמונות חדשות שנוספות לתיקייה יופיעו באתר אוטומטית (תוך כ-10 דקות).
 * שימו לב: בגלל ש"Who has access" הוא Anyone, כל מי שיש לו את כתובת הסקריפט יכול לראות את רשימת התמונות.
 * התמונות עצמן מוצגות באתר רק אם הן משותפות ב-Drive ("כל מי שיש לו את הקישור").
 */
const FOLDER_ID = '16m87owSSRfjEpgxak8I286BvqwfnTH57';
const CACHE_SECONDS = 600;

function doGet(e) {
  const refresh = e && e.parameter && e.parameter.refresh;
  const cache = CacheService.getScriptCache();
  if (!refresh) {
    const hit = cache.get('gallery');
    if (hit) return json_(hit);
  }
  const sections = [];
  walk_(DriveApp.getFolderById(FOLDER_ID), '', sections);
  const out = JSON.stringify({
    updated: new Date().toISOString(),
    sections: sections.filter(function (s) { return s.images.length > 0; })
  });
  if (out.length < 90000) cache.put('gallery', out, CACHE_SECONDS);
  return json_(out);
}

function json_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function byName_(a, b) {
  return a.name.localeCompare(b.name, 'he', { numeric: true });
}

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
  subs.forEach(function (s) {
    walk_(s.folder, path ? path + ' / ' + s.name : s.name, sections);
  });
}
