# 1.0.0 リリース準備計画

## 現状確認

- `manifest.json` バージョン: `1.0.0`（設定済み）
- テスト: 139件全件パス（Jest）
- `jest.config.js` の setupFiles パス: 正しい（修正不要）
- `popup.html`: `utils/status.js` を `popup.js` より前にロード済み（修正不要）
- `.gitignore`: `dist/` の追加が必要

---

## タスク一覧（実施順）

### 1. `.gitignore` に `dist/` を追加

**ファイル**: `.gitignore`

`dist/` を末尾に追加。パッケージングスクリプトより先に設定してビルド成果物の誤コミットを防ぐ。

---

### 2. パッケージングスクリプトの作成

**新規ファイル**: `scripts/package.js`

- Node.js 組み込みモジュール（`fs`, `path`, `child_process`）のみ使用（外部依存なし）
- `manifest.json` からバージョンを自動取得
- `extension/` ディレクトリ全体を `dist/library-checker-v{VERSION}.zip` に圧縮
- システムの `zip` コマンドを使用（macOS/Linux/Ubuntu CI で標準利用可能）

**`package.json` への追加**:
```json
"package": "node scripts/package.js"
```

---

### 3. GitHub Actions CI/CD の作成

**新規ファイル**: `.github/workflows/ci.yml`

- トリガー: `main` ブランチへの push / PR
- Node.js 20.x と 22.x でマトリクステスト
- ステップ: `npm ci` → `npm test` → `npm run test:coverage`
- カバレッジレポートをアーティファクトとして7日間保持（Node.js 20.x のみ）
- 使用 actions: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`

---

### 4. README.md の作成

**新規ファイル**: `README.md`

構成:
- バッジ行（CI ステータス・バージョン・ライセンス）
- 概要・機能一覧
- Chrome Web Store インストール方法（リリース後追記のプレースホルダー）
- 開発者向けインストール手順（ソースから読み込む方法）
- 使い方（APIキー取得・図書館設定・書籍ページ確認）
- カーリル APIキー取得方法へのリンク
- 開発者向け情報（必要環境・セットアップ・テスト実行・パッケージング・ディレクトリ構成）
- ライセンス（MIT）

---

### 5. CHANGELOG.md の作成

**新規ファイル**: `CHANGELOG.md`

- [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) 形式
- `[Unreleased]` セクション（空）
- `[1.0.0] - 2026-04-04` セクション（Added 項目）
  - 主要機能をすべて列挙（書籍ページ対応・蔵書検索・ウィジェット・設定ページ・テスト等）
- GitHub Compare/Releases リンクをフッターに記載

---

### 6. コミット・タグ・GitHub リリース

```bash
# テスト確認
npm test

# パッケージ作成・内容確認
npm run package
unzip -l dist/library-checker-v1.0.0.zip

# タグ作成・プッシュ
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# GitHub リリース作成（zip添付）
gh release create v1.0.0 \
  --title "v1.0.0 - 初回リリース" \
  --notes-file CHANGELOG.md \
  dist/library-checker-v1.0.0.zip
```

---

## 変更ファイル一覧

| ファイル | 操作 |
|---------|------|
| `.gitignore` | 編集（`dist/` 追加） |
| `scripts/package.js` | 新規作成 |
| `package.json` | 編集（`package` スクリプト追加） |
| `.github/workflows/ci.yml` | 新規作成 |
| `README.md` | 新規作成 |
| `CHANGELOG.md` | 新規作成 |

## 検証方法

1. `npm test` が139件全件パスすること
2. `npm run package` で `dist/library-checker-v1.0.0.zip` が生成されること
3. `unzip -l dist/library-checker-v1.0.0.zip` で `manifest.json` 等の主要ファイルが含まれること
4. GitHub Actions が push 時に自動実行されてグリーンになること
5. README.md が GitHub でレンダリングされて読みやすいこと
