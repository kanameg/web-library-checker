# Research & Design Decisions

---

## Summary
- **Feature**: `library-formal-name`
- **Discovery Scope**: Extension（既存システムへの拡張）
- **Key Findings**:
  - `options.js` の検索結果表示はすでに `formal_name || systemname` を使用しており要件 1・2 は概ね満たされている
  - `chrome.storage.sync` に保存する図書館データ（`libraries` 配列）は `systemname` フィールドを持たないため、ウィジェット・ポップアップが `systemname` を参照できない
  - ウィジェット（`content_script.js`）とポップアップ（`popup.js`）はストレージから読み込んだ `library.name` をそのまま表示しており、保存時に `systemname` を追加するだけで対応可能

---

## Research Log

### 既存コードの統合ポイント調査

- **Context**: 要件 4 の対応にあたり、ウィジェット・ポップアップがどのフィールドを参照しているか確認
- **Sources Consulted**: `extension/options/options.js`、`extension/content/content_script.js`、`extension/popup/popup.js`
- **Findings**:
  - `options.js:115` — 検索結果表示: `lib.formal_name || lib.systemname` ✓
  - `options.js:129` — 保存データ: `name: lib.formal_name || lib.systemname`（`systemname` フィールドなし）
  - `content_script.js:141` — ウィジェット: `library.name` を `systemName` 変数として使用
  - `popup.js:38,44,55` — ポップアップ: `library.name` を表示
- **Implications**: 保存時に `systemname` を追加し、ウィジェット・ポップアップの参照先を `library.systemname || library.name` に変更するだけで対応完了

### カーリル API `/library` レスポンスフィールド確認

- **Context**: `formal_name` と `systemname` の使い分けを明確化
- **Sources Consulted**: `プログラム仕様書.md`、`extension/api/calil.js`
- **Findings**:
  - `/library` エンドポイントは配列を返す。各要素が1つの図書館システムを表す
  - `systemname`: 略称・通称（短い名前）
  - `formal_name`: 正式名称（長い名前、空の場合あり）
  - どちらも `searchLibraries()` が返す配列にそのまま含まれる
- **Implications**: 既存の API クライアントに変更不要。`options.js` がこれらのフィールドを直接参照できる

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations |
|--------|-------------|-----------|---------------------|
| **ストレージ拡張** | `systemname` フィールドを保存データに追加し、ウィジェット・ポップアップで参照 | 変更範囲最小、後方互換性あり（フォールバックで既存データにも対応） | 既存保存データには `systemname` がないため初回は `library.name` にフォールバックされる |
| 表示時変換 | `library.name` を表示する際にサービスワーカー経由で再取得 | 常に最新のAPIデータを使用 | 余分なAPI通信が発生、複雑度が増す |

**選択**: ストレージ拡張。最小変更で要件を満たし、後方互換性も確保できる。

---

## Design Decisions

### Decision: `systemname` をストレージの既存スキーマに追加

- **Context**: ウィジェット・ポップアップがシステム名称を表示するために参照できるフィールドが必要
- **Alternatives Considered**:
  1. ストレージに `systemname` 追加 — シンプル、後方互換あり
  2. 表示時にサービスワーカー経由で再取得 — 常に最新だが通信コスト増
- **Selected Approach**: `chrome.storage.sync` の `libraries` 配列要素に `systemname` フィールドを追加。ウィジェット・ポップアップは `library.systemname || library.name` で参照
- **Rationale**: 変更ファイル数が最少（3ファイル）で、`library.name` へのフォールバックで旧保存データにも後方互換を維持できる
- **Trade-offs**: 旧保存データには `systemname` がないため、再保存するまでウィジェット・ポップアップは `library.name`（正式名称）が表示される。ユーザー影響は軽微
- **Follow-up**: 単体テスト（`service_worker.test.js` または `widget.test.js`）に `systemname` フォールバックを追加確認

---

## Risks & Mitigations

- **既存保存データとの非互換**: `systemname` が存在しない旧データを読んだ際、ウィジェット・ポップアップは `library.name` にフォールバックする。再保存すれば自動修正されるため許容範囲
- **`formal_name` が空のケース**: `options.js` は `formal_name || systemname` でフォールバック済み。`systemname` も空の場合は空文字が表示されるが、カーリル API の実データでは発生しにくい
