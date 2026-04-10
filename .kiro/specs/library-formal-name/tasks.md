# 実装計画

## タスクリスト

- [x] 1. 保存スキーマ拡張: `systemname` フィールド追加
- [x] 1.1 図書館の選択・保存時に `systemname` を保存データに含める
  - 設定ページで図書館チェックボックスを選択した際に、`systemname` フィールドを選択済みリストのデータに追加する
  - `formal_name` が空の場合に `systemname` へフォールバックして `name` を決定する既存ロジックは維持する
  - 保存されたデータに `systemname` フィールドが存在することを手動確認できる状態（`chrome.storage.sync` の内容に `systemname` が含まれる）
  - _Requirements: 3.1, 3.2, 4.4_

- [x] 2. ウィジェット・ポップアップのシステム名称表示
- [x] 2.1 (P) ウィジェットの図書館システム名をシステム名称に変更する
  - ウィジェットの図書館システムブロックヘッダーに表示する館名を `library.name` から `library.systemname`（フォールバック: `library.name`）に変更する
  - 旧保存データ（`systemname` フィールドなし）を読み込んだ場合でも `library.name` にフォールバックして表示が崩れないこと
  - ウィジェットの図書館名がシステム名称で表示される
  - _Requirements: 4.1, 4.3_
  - _Boundary: content_script.js 表示レイヤー_

- [x] 2.2 (P) ポップアップの図書館名をシステム名称に変更する
  - ポップアップの図書館一覧（貸出可・貸出中・確認失敗の各行）の館名表示を `library.name` から `library.systemname`（フォールバック: `library.name`）に変更する（3 箇所）
  - 旧保存データ（`systemname` フィールドなし）を読み込んだ場合でも `library.name` にフォールバックして表示が崩れないこと
  - ポップアップの図書館名がシステム名称で表示される
  - _Requirements: 4.2, 4.3_
  - _Boundary: popup.js 表示レイヤー_

- [x] 3. テスト・検証
- [x] 3.1 (P) 設定ページの正式名称表示と保存データのユニットテストを追加する
  - `formal_name` が存在する場合に検索結果・選択済みリストの館名表示として正式名称が使われることを検証する
  - `formal_name` が空の場合に `systemname` にフォールバックすることを検証する
  - 保存データの `name` フィールドに `formal_name || systemname` が格納され、`systemname` フィールドに `systemname` が格納されることを検証する
  - 全テストが `npm test` で通過する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 4.4_
  - _Boundary: options.js テスト_

- [x] 3.2 (P) ウィジェット・ポップアップのシステム名称フォールバックのユニットテストを追加する
  - `systemname` フィールドが存在するデータでウィジェット・ポップアップがシステム名称を表示することを検証する
  - `systemname` フィールドが存在しない旧データでウィジェット・ポップアップが `name`（正式名称）にフォールバックして表示することを検証する
  - 全テストが `npm test` で通過する
  - _Requirements: 4.1, 4.2, 4.3_
  - _Boundary: content_script.js / popup.js テスト_
