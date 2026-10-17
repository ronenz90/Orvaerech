// Backend for the "Or VaErech LeNaama" site (Google Apps Script).
// 1. Stores the site content (rows, links, texts) in a Drive file.
// 2. Saving requires the admin password, kept as the Script Property ADMIN_PASSWORD (not in this code).
// 3. Serves the gallery: all images in FOLDER_ID and all its sub-folders.
// After pasting: Project Settings -> Script properties -> add ADMIN_PASSWORD.
// Then: Deploy -> Manage deployments -> pencil -> Version: New version -> Deploy.

var FOLDER_ID = '16m87owSSRfjEpgxak8I286BvqwfnTH57';   // gallery images folder
var DATA_FILE_NAME = 'naama-site-data.json';           // created in My Drive, holds the site content
var MAX_FAILS = 8;                                     // wrong attempts before lockout
var LETTERS_FILE_NAME = 'naama-letters.json';        // created in My Drive, holds the letters
var MAX_PENDING = 300;                               // letters waiting for approval
var MAX_LETTERS = 1500;                              // all letters
var SUBMITS_PER_HOUR = 40;                           // public submissions per hour (all visitors)
var CONTACT_FILE_NAME = 'naama-contact.json';        // backup copy of every contact message
var DEFAULT_CONTACT_TO = 'yaelbony21@gmail.com';     // used when no address is saved in the admin page
var CONTACTS_PER_HOUR = 15;                          // contact messages per hour (all visitors)
var LOCK_SECONDS = 900;                                // lockout duration (15 minutes)

// ---- entry points ----

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'site') return out_({ ok: true, data: readSite_() });
  if (p.action === 'letters') return out_({ ok: true, items: publicLetters_() });
  return gallery_(p);
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return out_({ ok: false, error: 'bad_request' }); }

  if (req && req.action === 'submit') return submit_(req);
  if (req && req.action === 'contact') return contact_(req);

  const auth = checkPassword_(req.password);
  if (auth !== 'ok') return out_({ ok: false, error: auth });

  if (req.action === 'login') return out_({ ok: true });

  if (req.action === 'letters_admin') {
    const d = readLetters_();
    return out_({ ok: true, auto: d.auto, items: d.items });
  }
  if (req.action === 'letters_op') {
    try { return out_(lettersOp_(req)); }
    catch (err) { return out_({ ok: false, error: 'invalid_data', detail: String(err) }); }
  }

  if (req.action === 'save') {
    let clean;
    try { clean = sanitize_(req.data); }
    catch (err) { return out_({ ok: false, error: 'invalid_data', detail: String(err) }); }
    writeSite_(clean);
    return out_({ ok: true, v: 4 });
  }
  return out_({ ok: false, error: 'bad_request' });
}

// ---- password ----

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

// ---- site storage ----

function readSite_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('site');
  if (hit) return JSON.parse(hit);
  const id = PropertiesService.getScriptProperties().getProperty('DATA_FILE_ID');
  if (!id) return null;
  try {
    const text = DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
    const data = JSON.parse(text);
    try { if (text.length < 40000) cache.put('site', text, 300); } catch (err) {}
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

// ---- letters (public submissions + admin moderation) ----

function readLetters_() {
  const id = PropertiesService.getScriptProperties().getProperty('LETTERS_FILE_ID');
  if (!id) return { auto: false, items: [] };
  try {
    const d = JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'));
    return { auto: !!d.auto, items: Array.isArray(d.items) ? d.items : [] };
  } catch (err) {
    return { auto: false, items: [] };
  }
}

function writeLetters_(d) {
  const props = PropertiesService.getScriptProperties();
  const text = JSON.stringify(d);
  let file = null;
  const id = props.getProperty('LETTERS_FILE_ID');
  if (id) { try { file = DriveApp.getFileById(id); } catch (err) { file = null; } }
  if (file) file.setContent(text);
  else props.setProperty('LETTERS_FILE_ID', DriveApp.createFile(LETTERS_FILE_NAME, text, 'text/plain').getId());
  CacheService.getScriptCache().remove('letters');
}

function publicLetters_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('letters');
  if (hit) return JSON.parse(hit);
  const list = readLetters_().items.filter(function (x) { return x.ok; })
    .map(function (x) { return { name: x.name, text: x.text, ts: x.ts }; }).reverse();
  const text = JSON.stringify(list);
  try { if (text.length < 40000) cache.put('letters', text, 120); } catch (err) {}
  return list;
}

function submit_(req) {
  if (req.hp) return out_({ ok: true, status: 'pending' });
  if (typeof req.text !== 'string' || (req.name != null && typeof req.name !== 'string')) return out_({ ok: false, error: 'bad_request' });
  const name = String(req.name || '').trim(), text = req.text.trim();
  if (!text) return out_({ ok: false, error: 'empty' });
  if (text.length > 3000 || name.length > 80) return out_({ ok: false, error: 'too_long' });
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('subs') || 0);
  if (n >= SUBMITS_PER_HOUR) return out_({ ok: false, error: 'busy' });
  cache.put('subs', String(n + 1), 3600);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = readLetters_();
    const pending = d.items.filter(function (x) { return !x.ok; }).length;
    if (pending >= MAX_PENDING || d.items.length >= MAX_LETTERS) return out_({ ok: false, error: 'full' });
    d.items.push({ id: Utilities.getUuid(), name: name, text: text, ts: new Date().toISOString(), ok: d.auto });
    writeLetters_(d);
    return out_({ ok: true, status: d.auto ? 'published' : 'pending' });
  } finally {
    lock.releaseLock();
  }
}

function lettersOp_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = readLetters_();
    const op = req.op;
    if (op === 'setauto') { d.auto = !!req.auto; }
    else if (op === 'add') {
      if (d.items.length >= MAX_LETTERS) throw 'full';
      const t = str_(req.text, 3000, 'text').trim();
      if (!t) throw 'empty';
      d.items.push({ id: Utilities.getUuid(), name: str_(req.name, 80, 'name').trim(), text: t, ts: new Date().toISOString(), ok: true });
    } else {
      const idx = d.items.findIndex(function (x) { return x.id === req.id; });
      if (idx < 0) throw 'not found';
      if (op === 'approve') d.items[idx].ok = true;
      else if (op === 'unapprove') d.items[idx].ok = false;
      else if (op === 'delete') d.items.splice(idx, 1);
      else if (op === 'edit') {
        const t2 = str_(req.text, 3000, 'text').trim();
        if (!t2) throw 'empty';
        d.items[idx].name = str_(req.name, 80, 'name').trim();
        d.items[idx].text = t2;
      } else throw 'bad op';
    }
    writeLetters_(d);
    return { ok: true, auto: d.auto, items: d.items };
  } finally {
    lock.releaseLock();
  }
}

// ---- contact form: sends an e-mail to the site owner ----

function contactTo_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CONTACT_TO');
  if (prop) return prop;
  const site = readSite_();
  const m = site && site.contact && site.contact.email;
  return m || DEFAULT_CONTACT_TO;
}

function logContact_(entry) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getScriptProperties();
    let list = [];
    let file = null;
    const id = props.getProperty('CONTACT_FILE_ID');
    if (id) {
      try { file = DriveApp.getFileById(id); list = JSON.parse(file.getBlob().getDataAsString('UTF-8')); } catch (err) { file = null; list = []; }
    }
    if (!Array.isArray(list)) list = [];
    list.push(entry);
    if (list.length > 300) list = list.slice(list.length - 300);
    const text = JSON.stringify(list);
    if (file) file.setContent(text);
    else props.setProperty('CONTACT_FILE_ID', DriveApp.createFile(CONTACT_FILE_NAME, text, 'text/plain').getId());
  } catch (err) {
  } finally {
    lock.releaseLock();
  }
}

function contact_(req) {
  if (req.hp) return out_({ ok: true });
  if (typeof req.text !== 'string') return out_({ ok: false, error: 'bad_request' });
  const name = String(req.name == null ? '' : req.name).trim();
  const mail = String(req.email == null ? '' : req.email).trim();
  const text = req.text.trim();
  if (text.length < 2) return out_({ ok: false, error: 'empty' });
  if (text.length > 3000 || name.length > 80 || mail.length > 120) return out_({ ok: false, error: 'too_long' });
  if (mail && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(mail)) return out_({ ok: false, error: 'bad_email' });
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('mails') || 0);
  if (n >= CONTACTS_PER_HOUR) return out_({ ok: false, error: 'busy' });
  cache.put('mails', String(n + 1), 3600);

  logContact_({ ts: new Date().toISOString(), name: name, email: mail, text: text });
  const body = [
    '\u05e9\u05dd' + ': ' + (name || '\u05dc\u05d0 \u05e6\u05d5\u05d9\u05df'),
    '\u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05dc\u05d4\u05e9\u05d1\u05d4' + ': ' + (mail || '\u05dc\u05d0 \u05e6\u05d5\u05d9\u05df'),
    '',
    '\u05d4\u05d4\u05d5\u05d3\u05e2\u05d4' + ':',
    text,
    '',
    '--',
    '\u05d0\u05e4\u05e9\u05e8 \u05dc\u05d4\u05e9\u05d9\u05d1 \u05d9\u05e9\u05d9\u05e8\u05d5\u05ea \u05dc\u05d4\u05d5\u05d3\u05e2\u05d4 \u05d4\u05d6\u05d0\u05ea \u05d0\u05dd \u05d4\u05db\u05d5\u05ea\u05d1 \u05d4\u05e9\u05d0\u05d9\u05e8 \u05d0\u05d9\u05de\u05d9\u05d9\u05dc.'
  ].join('\n');
  const opts = { to: contactTo_(), subject: '\u05d4\u05d5\u05d3\u05e2\u05d4 \u05d7\u05d3\u05e9\u05d4 \u05de\u05d0\u05ea\u05e8 \u05d0\u05d5\u05e8 \u05d5\u05e2\u05e8\u05da \u05dc\u05e0\u05e2\u05de\u05d4', body: body };
  if (mail) opts.replyTo = mail;
  let mailed = true;
  try { MailApp.sendEmail(opts); } catch (err) { mailed = false; }
  return out_({ ok: true, mailed: mailed });
}

// Run this function once from the editor (Run button) to approve sending e-mail.
function authorizeMail() {
  MailApp.sendEmail(contactTo_(), '\u05d1\u05d3\u05d9\u05e7\u05d4: \u05e9\u05dc\u05d9\u05d7\u05ea \u05de\u05d9\u05d9\u05dc \u05de\u05d0\u05ea\u05e8 \u05d0\u05d5\u05e8 \u05d5\u05e2\u05e8\u05da \u05dc\u05e0\u05e2\u05de\u05d4', '\u05d0\u05dd \u05e7\u05d9\u05d1\u05dc\u05ea\u05dd \u05d0\u05ea \u05d4\u05d4\u05d5\u05d3\u05e2\u05d4 \u05d4\u05d6\u05d0\u05ea, \u05e9\u05dc\u05d9\u05d7\u05ea \u05d4\u05de\u05d9\u05d9\u05dc\u05d9\u05dd \u05de\u05d4\u05d0\u05ea\u05e8 \u05de\u05d0\u05d5\u05e9\u05e8\u05ea \u05d5\u05e4\u05d5\u05e2\u05dc\u05ea.');
}

// ---- validation - only known fields are stored ----

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

function list_(a, max, name, fn) {
  if (a == null) return [];
  if (!Array.isArray(a) || a.length > max) throw name + ' list';
  return a.map(function (r) {
    if (!r || typeof r !== 'object') throw name + ' item';
    return fn(r);
  });
}

function email_(v) {
  const s = str_(v, 120, 'contact.email').trim();
  if (s && !/^[^\s@<>\"]+@[^\s@<>\"]+\.[^\s@<>\"]+$/.test(s)) throw 'contact.email invalid';
  return s;
}

function sanitize_(d) {
  if (!d || typeof d !== 'object') throw 'no data';
  if (!Array.isArray(d.books) || d.books.length > 40) throw 'books';
  const g = d.gallery || {}, s = d.story || {}, i = d.info || {}, f = d.footer || {};
  const w = d.writes || {}, n = d.news || {}, v = d.video || {}, h = d.home || {}, dn = d.donate || {}, ct = d.contact || {};
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
    footer: { line1: str_(f.line1, 300, 'footer.line1'), line2: str_(f.line2, 300, 'footer.line2') },
    video: { url: url_(v.url, 'video.url') },
    home: { title: str_(h.title, 200, 'home.title'), text: str_(h.text, 10000, 'home.text') },
    donate: { url: url_(dn.url, 'donate.url') },
    contact: { email: email_(ct.email) },
    writes: {
      title: str_(w.title, 100, 'writes.title'), subtitle: str_(w.subtitle, 100, 'writes.subtitle'),
      items: list_(w.items, 500, 'writes', function (r) { return { name: str_(r.name, 100, 'writes.name'), text: str_(r.text, 6000, 'writes.text') }; })
    },
    news: {
      title: str_(n.title, 100, 'news.title'), subtitle: str_(n.subtitle, 100, 'news.subtitle'),
      items: list_(n.items, 300, 'news', function (r) { return { title: str_(r.title, 200, 'news.title'), source: str_(r.source, 100, 'news.source'), url: url_(r.url, 'news.url') }; })
    }
  };
  if (JSON.stringify(clean).length > 400000) throw 'too large';
  return clean;
}

// ---- gallery ----

function gallery_(p) {
  const cache = CacheService.getScriptCache();
  if (!p.refresh) {
    const hit = getBig_('gallery');
    if (hit) return json_(hit);
  }
  const sections = [];
  walk_(DriveApp.getFolderById(FOLDER_ID), '', sections);
  const text = JSON.stringify({
    updated: new Date().toISOString(),
    sections: sections.filter(function (s) { return s.images.length > 0; })
  });
  putBig_('gallery', text, 3600);
  return json_(text);
}

function putBig_(key, text, secs) {
  const size = 30000;
  const n = Math.ceil(text.length / size);
  if (n > 40) return;
  const o = {};
  for (let i = 0; i < n; i++) o[key + '_' + i] = text.substr(i * size, size);
  o[key + '_n'] = String(n);
  try { CacheService.getScriptCache().putAll(o, secs); } catch (err) {}
}

function getBig_(key) {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get(key + '_n') || 0);
  if (!n) return null;
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(key + '_' + i);
  const got = cache.getAll(keys);
  let t = '';
  for (let i = 0; i < n; i++) {
    const part = got[key + '_' + i];
    if (part == null) return null;
    t += part;
  }
  return t;
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
  sections.push({ name: path, images: images.map(function (x) { return { id: x.id }; }) });
  const subs = [];
  const it = folder.getFolders();
  while (it.hasNext()) { const s = it.next(); subs.push({ name: s.getName(), folder: s }); }
  subs.sort(byName_);
  subs.forEach(function (s) { walk_(s.folder, path ? path + ' / ' + s.name : s.name, sections); });
}

// ---- output ----

function json_(text) { return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON); }
function out_(obj) { return json_(JSON.stringify(obj)); }
