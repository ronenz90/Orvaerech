/* defaults for newer content blocks + YouTube helper (shared by the site and the admin page) */
(function (root) {
  "use strict";
  var DEF_HOME_TITLE = 'נעמונא – אור וערך לנעמה בוני ז״ל';
  var DEF_HOME_TEXT = 'יש אנשים שהאור שלהם ממשיך להאיר גם כשהם אינם. נעמה שלנו הייתה כזאת. צעירה מלאת חיים, אהבה, סקרנות, אמונה ונתינה. ילדה־אישה שידעה לאהוב אנשים, להתרגש מהדברים הקטנים, לחלום בגדול ולראות את הטוב שסביבה.\n\nבשבעה באוקטובר 2023 נפלה נעמה בקרב במוצב יפתח, כשהיא בת 19 בלבד. מאז, לצד הגעגוע שאינו מרפה והחסר שאין לו תחליף, אנחנו מבקשים להמשיך את דרכה ולהעניק מקום לערכים שהיו חלק בלתי נפרד מחייה.\n\nהאתר הזה נולד מתוך אהבה גדולה ומתוך הבחירה להפוך את הזיכרון למקור של משמעות, למידה ועשייה.\n\nכאן נפגשים סיפורה של נעמה, פרשות השבוע בראי ערכים ותובנות מעולם ה־NLP, מחשבות ומכתבים אישיים, ויוזמות חברתיות המבקשות לחבר בין אנשים ולעשות טוב.\n\nהכתיבה הפכה עבורי לדרך להיאחז, ללמוד ולמצוא כוחות. התורה הייתה לי למשענת ולעוגן, וכל פרשה פתחה בפניי אפשרות להתבונן בחיים, לזהות ערכים ולבחור כיצד להמשיך לצעוד גם במציאות שהשתנתה ללא הכר.\n\nעם הזמן הפכה הדרך האישית הזאת למרחב משותף של אנשים שמבקשים למצוא משמעות, תקווה וכוח בתוך אתגרי החיים.\n\nאנחנו לא יכולים לשנות את מה שקרה, אבל אנחנו יכולים לבחור מה לעשות עם האהבה שנותרה.\n\nאני מזמינה אתכם להכיר את נעמה, לקרוא, לחשוב, להרגיש, לקחת איתכם ערך אחד ולהעביר אותו הלאה.\n\nכי עבורנו, להמשיך את דרכה של נעמה פירושו לא רק לזכור את מי שהייתה, אלא גם לחיות משהו ממה שהאמינה בו.\n\nנעמונה שלנו. האור שלך ממשיך איתנו!';
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
    if (!d.home) d.home = {};
    if (typeof d.home.title !== "string") d.home.title = DEF_HOME_TITLE;
    if (typeof d.home.text !== "string") d.home.text = DEF_HOME_TEXT;
    if (!d.donate) d.donate = {};
    if (typeof d.donate.url !== "string") d.donate.url = "";
    if (!d.contact) d.contact = {};
    if (typeof d.contact.email !== "string") d.contact.email = "yaelbony21@gmail.com";
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
