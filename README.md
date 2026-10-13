# אור וערך לנעמה – אתר קישורים (GitHub Pages)

## פריסה
1. צרו ריפוזיטורי ב-GitHub והעלו אליו את כל תוכן התיקייה (index.html בשורש).
2. Settings → Pages → Deploy from a branch → `main` / `(root)`.
3. האתר: `https://<משתמש>.github.io/<ריפוזיטורי>/` · דף הניהול: `.../admin.html`

## מבנה
- `data/site.json` – כל התוכן המשתנה: שורות הפרשות והקישורים, קישור הגלריה, קישור לסיפור (אופציונלי), טקסט "מידע על האתר", שורות התחתית.
- `index.html`, `css/style.css`, `js/main.js` – האתר.
- `admin.html`, `js/admin.js`, `css/admin.css` – דף ניהול.
- `assets/` – קלף, נוצה, לוגו וכותרות (חולצו מה-PDF של Canva).

## דף הניהול
פותחים `admin.html`, עורכים, ולוחצים "שמירה באתר". השמירה מבצעת commit ל-`data/site.json` דרך GitHub API.
בפעם הראשונה: "הגדרות GitHub" ← שם משתמש, ריפוזיטורי, וה-Token (Fine-grained, הרשאה Contents: Read and write לריפוזיטורי הזה בלבד).
ה-Token נשמר רק בדפדפן שלכם. אפשר גם "הורדת site.json" ולהחליף ידנית את הקובץ בריפוזיטורי.
אחרי שמירה, GitHub Pages מתעדכן תוך דקה-שתיים.

## Google Drive
קבצים ותיקיות חייבים להיות משותפים "כל מי שיש לו את הקישור – צפייה", אחרת יוצג חלון ריק.
