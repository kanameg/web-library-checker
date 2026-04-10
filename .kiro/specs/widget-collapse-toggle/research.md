# Research & Design Decisions

---
**Purpose**: ディスカバリフェーズの調査結果・アーキテクチャ調査・設計根拠を記録する。

---

## Summary
- **Feature**: `widget-collapse-toggle`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - 折りたたみ機能に必要な全コードは `extension/content/` の2ファイルに閉じる。サービスワーカー・API 通信への変更は不要
  - `localStorage` はプロジェクト内で未使用（`sessionStorage` のみ使用済み）。同パターンで安全に導入可能
  - 既存の ARIA 属性はプロジェクト全体で一切なし。本機能が初の WAI-ARIA 採用となる

## Research Log

### テストヘルパーの関数エクスポート方式

- **Context**: `content_script.js` は IIFE で包まれており、内部関数のテストには `tests/helpers/load-content-script.js` が IIFE テールを文字列置換して関数を露出させるアプローチを採用している
- **Findings**:
  - 現在のエクスポートリスト: `setWidgetResults`, `getCacheKey`, `loadFromCache`, `saveToCache`
  - 新規追加関数（`loadToggleState`, `saveToggleState`, `createWidget` 等）をテストしたい場合は、エクスポートリストに追記が必要
  - 文字列パターン `'  main();\n})();'` がテールマッチに使われているため、コードフォーマット変更は注意が必要
- **Implications**: テストタスクでは `load-content-script.js` のエクスポートリスト更新も必須作業として含める

### localStorage vs sessionStorage の選択

- **Context**: 要件 3 が「ページリロードまたは別書籍ページへ移動後も状態を保持」と定義している
- **Findings**:
  - `sessionStorage`: タブ単位・ページ遷移で消える。API キャッシュ用途では適切だが、永続的なUI設定には不適
  - `localStorage`: オリジン単位で永続化（タブ・ウィンドウ・セッションを超える）。Chrome 拡張機能コンテンツスクリプトは挿入先オリジン（amazon.co.jp / rakuten.co.jp）の `localStorage` にアクセスするため、ドメイン毎に独立して保持される
  - `chrome.storage.sync`: ユーザー設定を保存するが、非同期 API のため UI 状態の読み書きには重い
- **Implications**: `localStorage` が要件に最適。`sessionStorage` と同様に try-catch でエラーをサイレントに無視するパターンを踏襲する

### WAI-ARIA ボタンパターン

- **Context**: 要件 4 が `aria-expanded` と `aria-label` / `title` を要求している
- **Findings**:
  - `<button>` 要素はデフォルトで `role="button"` を持ち、Enter/Space でキーボード操作可能。`<div>` や `<span>` の代わりに `<button>` を使うことで `tabindex` 追加が不要になる
  - `aria-expanded="true/false"` は折りたたみコンテナを制御するボタンの標準属性
  - アイコン選択: `▲`（折りたたみ方向）/ `▼`（展開方向）は視覚的に直感的。CSS アニメーション不要
- **Implications**: `<button>` 要素を採用することでキーボード対応と ARIA が最小実装で達成できる

## Architecture Pattern Evaluation

| Option | 説明 | 強み | リスク/制限 | 評価 |
|--------|------|------|------------|------|
| A: 既存ファイル拡張 | `content_script.js` に関数追加・`createWidget()` 修正 | 新規ファイル不要・既存パターン踏襲 | ファイル行数増（+60行程度） | **採用** |
| B: 新規モジュール分離 | `widget_collapse.js` を新規作成 | 関心の分離 | `manifest.json` 変更必要・過剰設計 | 却下 |

## Design Decisions

### Decision: `<button>` 要素の採用

- **Context**: トグルボタンの DOM 要素型の選択
- **Alternatives Considered**:
  1. `<span>` — 軽量だが `tabindex` と `role="button"` の手動追加が必要
  2. `<button>` — セマンティクス・キーボード対応が組み込み済み
- **Selected Approach**: `<button type="button">` を使用
- **Rationale**: キーボード操作（Enter/Space）・フォーカス管理が標準で得られ、ARIA 要件を最小コードで満たせる
- **Trade-offs**: ブラウザデフォルトのボタンスタイルをリセットする CSS が必要（`background: none; border: none; cursor: pointer;`）

### Decision: `localStorage` キー名

- **Context**: 折りたたみ状態の永続化キーの命名
- **Alternatives Considered**:
  1. `calil_collapsed` — 短い
  2. `calil_widget_collapsed` — 機能が明確
- **Selected Approach**: `calil_widget_collapsed`
- **Rationale**: 既存キー (`calil_{isbn}_{systemids}`) の `calil_` プレフィックス規則に準拠。他のキーと衝突しない
- **Trade-offs**: 値は `'1'`（折りたたみ）/ キーなし（展開）とする。`'true'/'false'` より単純

### Decision: 折りたたみ対象の DOM 要素

- **Context**: 要件 2 が `.calil-body` と `.calil-footer` の非表示を要求
- **Selected Approach**: CSS `display: none` の切り替えで実装。JS から `element.style.display = 'none'` / `''` を操作
- **Rationale**: CSS クラス付与案（`.calil-collapsed`）と比較して、状態を HTML 属性（`aria-expanded`）と完全に同期させやすい
- **Follow-up**: `display: none` が既存の `min-height: 24px` 指定と競合しないか実装時に確認

## Risks & Mitigations

- `localStorage` がサードパーティ Cookie 制限やセキュリティポリシーでブロックされる可能性 — try-catch でサイレントにフォールバック（既存 `sessionStorage` と同パターン）
- Amazon・楽天ブックスがコンテンツスクリプトの `localStorage` アクセスを CSP で制限する可能性 — 現行の `sessionStorage` 利用が問題なく動作しているため低リスク

## References

- [WAI-ARIA Authoring Practices: Disclosure Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) — aria-expanded を持つボタンのベストプラクティス
- [MDN: localStorage](https://developer.mozilla.org/ja/docs/Web/API/Window/localStorage) — ブラウザ API リファレンス
