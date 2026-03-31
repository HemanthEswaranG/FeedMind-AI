const fs = require('fs');
let css = fs.readFileSync('D:/FeedMind AI/frontend/src/App.css', 'utf-8');
css = css.replace(/font-family:[^;]+;/g, '');
fs.writeFileSync('D:/FeedMind AI/frontend/src/App.css', css);
console.log('Fonts removed from App.css');
