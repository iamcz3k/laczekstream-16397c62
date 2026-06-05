const fs = require('fs');
const path = require('path');

const clientDir = path.join(process.cwd(), 'dist', 'client');
const rootDist = path.join(process.cwd(), 'dist');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

try {
  // If dist/client exists, copy it into dist so Vercel publishes the app at dist/
  if (fs.existsSync(clientDir)) {
    console.log('postbuild: dist/client found — copying to dist/');
    copyDir(clientDir, rootDist);
  } else {
    console.log('postbuild: dist/client not found — nothing to copy');
  }
} catch (err) {
  console.error('postbuild: failed to copy dist/client -> dist', err);
  process.exit(1);
}
