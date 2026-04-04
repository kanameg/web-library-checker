#!/usr/bin/env node
/**
 * Chrome Web Store 提出用 ZIP パッケージ作成スクリプト
 *
 * 使用方法: npm run package
 * 出力先:   dist/library-checker-v{VERSION}.zip
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const EXTENSION_DIR = path.join(ROOT, 'extension');
const DIST_DIR = path.join(ROOT, 'dist');

const manifest = JSON.parse(
  fs.readFileSync(path.join(EXTENSION_DIR, 'manifest.json'), 'utf8')
);
const version = manifest.version;
const outputName = `library-checker-v${version}.zip`;
const outputPath = path.join(DIST_DIR, outputName);

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

try {
  execSync(`cd "${EXTENSION_DIR}" && zip -r "${outputPath}" .`, { stdio: 'inherit' });
  console.log(`\nパッケージ作成完了: dist/${outputName}`);
  console.log(`バージョン: ${version}`);
} catch (err) {
  console.error('パッケージ作成に失敗しました:', err.message);
  process.exit(1);
}
