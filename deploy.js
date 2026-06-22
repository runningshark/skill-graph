/**
 * Deploy to Vercel via their REST API
 * Usage: node deploy.js <VERCEL_TOKEN>
 * No external dependencies — uses only Node.js built-in https module
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const VERCEL_TOKEN = process.argv[2];
if (!VERCEL_TOKEN) {
  console.error('Usage: node deploy.js <VERCEL_TOKEN>');
  console.error('Get token from: https://vercel.com/account/tokens');
  process.exit(1);
}

const FILES_DIR = __dirname; // deploy.js is in skill-graph dir
const IGNORE = new Set(['deploy.js', 'tunnel.js', 'tunnel2.js', 'serve.py', 'package.json', 'node_modules']);

function getFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (IGNORE.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      files.push(...getFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function deploy() {
  const filePaths = getFiles(FILES_DIR);
  console.log(`Found ${filePaths.length} files to deploy`);

  const filesPayload = [];
  for (const fp of filePaths) {
    const relativePath = path.relative(FILES_DIR, fp).replace(/\\/g, '/');
    const content = fs.readFileSync(fp, 'utf-8');
    filesPayload.push({
      file: relativePath,
      data: content,
    });
    console.log(`  + ${relativePath}`);
  }

  const payload = JSON.stringify({
    name: 'skill-graph',
    files: filesPayload,
    projectSettings: { framework: null },
  });

  console.log('\nDeploying to Vercel...');

  const options = {
    hostname: 'api.vercel.com',
    path: '/v13/deployments',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('\n✅  Deployed successfully!');
            console.log(`   URL: ${data.url}`);
            console.log(`   Dashboard: https://vercel.com/${data.team?.slug || data.owner?.username || '?'}/${data.name}`);
            resolve(data);
          } else {
            console.error('\n❌  Deployment failed:', data.error?.message || data.message || body);
            reject(new Error(data.error?.message || 'Deploy failed'));
          }
        } catch (e) {
          console.error('\n❌  Parse error:', body);
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

deploy().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
