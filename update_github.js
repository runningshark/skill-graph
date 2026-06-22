const https = require('https');
const fs = require('fs');

const TOKEN = process.env.GH_TOKEN || 'YOUR_GITHUB_TOKEN';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: { 'Authorization': `token ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'deploy' },
    };
    const req = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Get current SHA
  const existing = await api('GET', '/repos/runningshark/skill-graph/contents/index.html');
  const sha = existing.sha;
  console.log('Current SHA:', sha);

  // Read and encode file
  const content = fs.readFileSync('index.html');
  const base64 = content.toString('base64');
  console.log('File size:', content.length, 'bytes');

  // Update
  const res = await api('PUT', '/repos/runningshark/skill-graph/contents/index.html', {
    message: 'Add resume page with tab navigation',
    content: base64,
    sha,
    branch: 'main',
  });
  if (res.content) {
    console.log('✓ Updated successfully');
    console.log('Site: https://runningshark.github.io/skill-graph/');
  } else {
    console.error('✗ Failed:', res.message || JSON.stringify(res));
  }
}

main().catch(e => console.error('Fatal:', e));
