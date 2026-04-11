# Technology Stack

## Architecture

Chrome 拡張機能（Manifest V3）のレイヤー構造。コンテンツスクリプト・ポップアップ・設定ページがサービスワーカーにメッセージを送信し、API 通信と設定管理をサービスワーカーに集約することでセキュリティを確保している。

```
コンテンツスクリプト ──┐
ポップアップ         ──┤  chrome.runtime.sendMessage  ──▶  service_worker.js
設定ページ           ──┘                                    └─▶ カーリル API
```

## Core Technologies

- **Language**: Vanilla JavaScript（ES2020+、TypeScript なし）
- **Runtime**: Chrome Extension Manifest V3 / Service Worker
- **Testing**: Jest 29 + jsdom（Node.js 20+ / npm 10+）
- **Build**: Node.js スクリプト（`scripts/package.js`）で ZIP 生成

## Key Libraries

- **Jest**: 単体テスト（`tests/` ディレクトリ、7 ファイル・139 テスト）
- **jest-environment-jsdom**: ブラウザ API のモック環境
- **カーリル図書館 API**: 外部 API（`https://api.calil.jp/`）

## Development Standards

### セキュリティ
- API キーはコンテンツスクリプトに渡さない。`chrome.storage.sync` に保存し、サービスワーカー経由でのみ使用
- DOM へのテキスト挿入は `document.createTextNode` 経由（`sanitize.js`）
- URL は `new URL()` でパースし、`http:`/`https:` 以外のプロトコルは `#` に置換

### API 通信パターン
- カーリル API はポーリング式（`continue=1` の間 2 秒待機で再リクエスト、最大 10 回）
- 複数図書館への並列リクエストは `Promise.allSettled` で処理
- リトライは最大 3 回・exponential backoff
- セッションキャッシュで重複リクエストを防止（`calil_{isbn}_{systemids}` をキー）

### 図書館エントリのデータモデル
`chrome.storage.sync` の `libraries` 配列に保存されるエントリのスキーマ：

```js
{
  systemid: "...",          // カーリル API の識別子（一意キー）
  name: "...",              // 表示名（API の formal フィールド優先、なければ systemname）
  systemname: "...",        // カーリル API の systemname（生値）
  pref: "...",              // 都道府県
  city: "...",              // 市区町村
}
```

- **`name` の導出ルール**: 選択時に `lib.formal || lib.systemname` を評価して保存
- **表示時のフォールバック**: UI コンポーネントは `library.systemname || library.name` で表示（後方互換性のため `name` を最終フォールバックとして使用）

### Testing
- テスト対象: `extension/api/calil.js`、`service_worker.js`、`content_script.js`、`popup.js`
- カバレッジ: `jest --coverage`（HTML レポート: `coverage/`）
- `chrome.*` API はテスト用ヘルパー（`tests/helpers/`）でモック

## Development Environment

### Required Tools
- Node.js 20.x 以上
- npm 10.x 以上
- Chrome（拡張機能のテスト用）

### Common Commands
```bash
# Test: npm test
# Coverage: npm run test:coverage
# Watch: npm run test:watch
# Package (ZIP): npm run package
```

## Key Technical Decisions

- **Manifest V3 採用**: Chrome の標準要件。サービスワーカーベースで永続バックグラウンドなし
- **Vanilla JS**: 外部フレームワーク不使用でバンドルステップを省略。拡張機能の軽量性を優先
- **`Promise.allSettled`**: 一部図書館の API エラーが他の結果を妨げないよう並列処理
- **コンテンツスクリプトへのユーティリティ分離**: `isbn.js`・`sanitize.js`・`status.js` を独立モジュール化し、`manifest.json` の `content_scripts.js` 配列で先頭から読み込む順序に依存

---
_Document standards and patterns, not every dependency_
