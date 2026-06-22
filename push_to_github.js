const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GH_TOKEN || 'YOUR_GITHUB_TOKEN';
const OWNER = 'runningshark';
const REPO = 'skill-graph';
const BRANCH = 'master';
const FILES_DIR = __dirname;

const IGNORE = new Set([
  'push_to_github.js', 'deploy.js', 'tunnel.js', 'tunnel2.js',
  'serve.py', 'package.json', 'package-lock.json', 'create_repo.json',
  'deploy_anon.py', 'node_modules', '.git', '.gitignore',
  'vercel-oidc-3.6.1.tgz',
]);

function getFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...getFiles(full));
    } else if (e.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: endpoint,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'deploy-script',
      },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getFileSha(path) {
  try {
    const res = await apiRequest('GET', `/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`);
    return res.sha || null;
  } catch { return null; }
}

async function uploadFile(filePath) {
  const relative = path.relative(FILES_DIR, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath);
  const base64 = content.toString('base64');

  const existingSha = await getFileSha(relative);

  const body = {
    message: existingSha ? `Update ${relative}` : `Add ${relative}`,
    content: base64,
    branch: BRANCH,
  };
  if (existingSha) body.sha = existingSha;

  const res = await apiRequest('PUT', `/repos/${OWNER}/${REPO}/contents/${relative}`, body);
  if (res.content) {
    console.log(`  ✓ ${relative}`);
  } else {
    console.error(`  ✗ ${relative}: ${res.message || JSON.stringify(res)}`);
  }
  return res;
}

async function enablePages() {
  console.log('\nEnabling GitHub Pages...');
  const res = await apiRequest('POST', `/repos/${OWNER}/${REPO}/pages`, {
    source: { branch: BRANCH, path: '/' },
  });
  if (res.html_url) {
    console.log(`  ✓ Pages enabled at ${res.html_url}`);
  } else if (res.message?.includes('already')) {
    console.log('  ✓ Pages already enabled');
  } else {
    console.log('  Note:', res.message || JSON.stringify(res));
  }
}

async function main() {
  const files = getFiles(FILES_DIR);
  console.log(`Uploading ${files.length} files to ${OWNER}/${REPO}...\n`);

  for (const f of files) {
    await uploadFile(f);
  }

  await enablePages();

  const url = `https://${OWNER}.github.io/${REPO}`;
  console.log(`\n🎉 Site should be at: ${url}`);
  console.log(`   (may take 1-2 minutes to propagate)`);
}

main().catch(e => console.error('Fatal:', e));
