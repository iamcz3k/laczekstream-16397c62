const fs = require('fs');
const path = require('path');

const distDir = path.join(process.cwd(), 'dist');
const fallbackSrc = path.join(process.cwd(), 'public', 'fallback-index.html');
const destIndex = path.join(distDir, 'index.html');

try {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  if (!fs.existsSync(destIndex)) {
    if (fs.existsSync(fallbackSrc)) {
      fs.copyFileSync(fallbackSrc, destIndex);
      console.log('postbuild: fallback-index.html copied to dist/index.html');
    } else {
      console.warn('postbuild: fallback-index.html not found in public/');
    }
  } else {
    console.log('postbuild: dist/index.html already exists; no action taken');
  }
} catch (err) {
  console.error('postbuild: error while ensuring index.html', err);
  process.exit(1);
}
