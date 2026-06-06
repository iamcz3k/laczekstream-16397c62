import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Copy dist/client to dist root
const clientDir = path.join(__dirname, '..', 'dist', 'client');
const distDir = path.join(__dirname, '..', 'dist');

try {
  if (fs.existsSync(clientDir)) {
    // Copy all files from dist/client to dist
    const files = fs.readdirSync(clientDir);
    files.forEach(file => {
      const src = path.join(clientDir, file);
      const dest = path.join(distDir, file);
      
      if (fs.lstatSync(src).isDirectory()) {
        // Copy directories recursively
        copyDirRecursive(src, dest);
      } else {
        // Copy files
        fs.copyFileSync(src, dest);
      }
    });
    console.log('postbuild: Copied dist/client/* to dist/');
  }
} catch (err) {
  console.error('postbuild error:', err);
  process.exit(1);
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    if (fs.lstatSync(srcFile).isDirectory()) {
      copyDirRecursive(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}
