const fs = require('fs');
const js = fs.readFileSync('dist/esm/client/index.js', 'utf8');
const requestRe = /this\.request\(\s*\{([\s\S]*?)\}\s*,\s*([A-Za-z0-9_]+)\s*,/g;
let m;
while ((m = requestRe.exec(js))) {
  const obj = m[1];
  const schema = m[2];
  const mm = obj.match(/method\s*:\s*['"]([^'"]+)['"]/);
  console.log('found request schema=', schema, 'method=', mm && mm[1]);
  const protoMethod = mm && mm[1];
  if (!protoMethod) continue;
  const esc = protoMethod.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const methodFinder = new RegExp('(?:async\\s+)?([A-Za-z0-9_]+)\\s*\\([^\\)]*\\)\\s*\\{[\\s\\S]*?this\\.request\\(\\s*\\{[\\s\\S]*?method\\s*:\\s*["\\']' + esc + '["\\'][\\s\\S]*?\\)', 'm');
  const mf = js.match(methodFinder);
  console.log('methodFinder match:', mf && mf[1]);
}
