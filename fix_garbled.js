const fs = require('fs');
const path = 'C:/Users/19794/skill-graph/app.js';

let content = fs.readFileSync(path, 'utf8');

// Every garbled string is the result of UTF-8 Chinese bytes read as latin1 then saved as UTF-8.
// We can reverse this: encode each garbled char as latin1 bytes, then decode as UTF-8.
function fixGarbled(str) {
  try {
    const buf = Buffer.from(str, 'latin1');
    return buf.toString('utf8');
  } catch { return str; }
}

// Find all single-quoted or double-quoted strings that contain non-ASCII characters
// and try to fix them
content = content.replace(/(['"])([^'"]*[^\x00-\x7F][^'"]*)\1/g, (match, quote, inner) => {
  const fixed = fixGarbled(inner);
  // Only replace if the result actually contains Chinese
  if (fixed !== inner && /[\u4e00-\u9fff]/.test(fixed)) {
    return quote + fixed + quote;
  }
  return match;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Done - garbled text fixed');
