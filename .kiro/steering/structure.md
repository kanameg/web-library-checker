# Project Structure

## Organization Philosophy

責務別レイヤー構成。Chrome 拡張機能のコンテキスト（バックグラウンド・コンテンツ・UI）ごとにディレクトリを分け、横断的なユーティリティを `utils/` に集約する。

## Directory Patterns

### 拡張機能ソース
**Location**: `extension/`  
**Purpose**: Chrome 拡張機能の実体。サブディレクトリが各コンテキストを担当  
**Example**: `manifest.json` が拡張機能のエントリポイントとして各コンテキストを宣言

### バックグラウンド（Service Worker）
**Location**: `extension/background/`  
**Purpose**: API 通信・設定管理・メッセージハブ。APIキーを保持する唯一のコンテキスト  
**Pattern**: `chrome.runtime.onMessage` でメッセージタイプをディスパッチ（`CHECK_LIBRARY`・`SEARCH_LIBRARIES`・`GET_SETTINGS`・`OPEN_OPTIONS`）

### コンテンツスクリプト
**Location**: `extension/content/`  
**Purpose**: Amazon・楽天ブックスのページに注入するスクリプト。ISBN 取得・ウィジェット挿入  
**Pattern**: `manifest.json` で `utils/*.js` を先行読み込みしてからロード

### ポップアップ・設定ページ（UI）
**Location**: `extension/popup/`・`extension/options/`  
**Purpose**: ユーザー向け UI。各ディレクトリに `.html`・`.css`・`.js` を格納  
**Pattern**: UI ロジックはサービスワーカー経由で操作

### API クライアント
**Location**: `extension/api/`  
**Purpose**: カーリル API との通信を担当する単一モジュール  
**Pattern**: ポーリングロジック・リトライ・セッションキャッシュをカプセル化

### 共有ユーティリティ
**Location**: `extension/utils/`  
**Purpose**: 複数コンテキストで使われる純粋関数群  
**Modules**: `isbn.js`（ISBN変換）・`sanitize.js`（XSS対策）・`status.js`（ステータス→CSSクラス）・`storage.js`（設定読み込み専用ヘルパー）

### テスト
**Location**: `tests/`  
**Purpose**: Jest による単体テスト。ファイル名は `{module}.test.js`  
**Pattern**: `tests/helpers/` に Chrome API モックを格納し、`setup.js` でグローバルに注入

## Naming Conventions

- **ファイル名**: スネークケース（`content_script.js`・`service_worker.js`）
- **関数名**: キャメルケース（`extractIsbnFromPage`・`sanitizeUrl`）
- **CSS クラス**: ケバブケース、`calil-` プレフィックス（`calil-library-checker`・`calil-status-icon`）
- **メッセージタイプ定数**: アッパースネークケース（`CHECK_LIBRARY`・`GET_SETTINGS`）

## Code Organization Principles

- **ユーティリティは副作用なし**: `utils/` の各モジュールは DOM や chrome API に依存しない純粋関数のみ
- **設定の書き込みは呼び出し元**: `storage.js` は読み込み専用ヘルパー。書き込みは `options.js`・`service_worker.js` が直接 `chrome.storage.sync.set()` を呼ぶ
- **APIキーの隔離**: コンテンツスクリプトはメッセージパッシングを経由してのみ API 結果を受け取り、APIキー自体にアクセスしない
- **仕様書との対応**: `プログラム仕様書.md` が実装の正式仕様として機能し、`.kiro/specs/` は新機能開発に使用

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
