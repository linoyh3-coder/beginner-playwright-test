// שרת קטן שמגיש את קבצי המשחק מתיקיית game.
// הרצה: npm run game  ואז לפתוח http://127.0.0.1:3000
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, 'game');
const port = Number(process.env.PORT) || 3000;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.normalize(path.join(root, urlPath === '/' ? 'index.html' : urlPath));

    // הגנה: לא מאפשרים לבקש קבצים מחוץ לתיקיית game
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  })
  // 127.0.0.1 = נגיש רק מהמחשב שלך
  .listen(port, '127.0.0.1', () => {
    console.log(`המשחק רץ בכתובת http://127.0.0.1:${port}`);
  });
