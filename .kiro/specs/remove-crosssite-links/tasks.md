# Implementation Plan — remove-crosssite-links

- [x] 1. ウィジェットフッターのクロスサイトリンク生成コードとスタイルを削除する

- [x] 1.1 buildCrossSiteLink 関数とそれに関連する createWidget の引数を除去する
  - content_script.js から `buildCrossSiteLink(site, isbn)` 関数定義全体を削除する
  - `createWidget(site, isbn)` の呼び出しを `createWidget()` に変更し、関数定義の引数 `site`・`isbn` を除去する
  - `main()` 内の `createWidget(site, isbn)` 呼び出しを `createWidget()` に更新する
  - ウィジェットフッターのHTML文字列に `calil-crosssite-link` 要素が含まれないことを確認する
  - フッターに「設定を変更」リンクが先頭（左端）に残り、「Powered by カーリル」リンクも存在することを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3_

- [x] 1.2 (P) コンテンツスクリプトのスタイルシートからクロスサイトリンクのスタイル定義を削除する
  - content_script.css の `.calil-crosssite-link` ルールセット全体を削除する（独立定義なし・対象なし）
  - スタイルシートに `calil-crosssite-link` の記述が残っていないことを確認する
  - _Requirements: 3.1_
  - _Boundary: content_script.css_

- [x] 2. (P) isbn.js から isbn13to10 関数を削除する
  - `isbn13to10(isbn13)` 関数定義ブロック全体（JSDoc コメントを含む）を isbn.js から削除する
  - isbn.js 内に `isbn13to10` への参照が残っていないことを確認する
  - isbn.js の他の変換関数（`isbn10to13`・`toIsbn13` 等）に変更を加えないことを確認する
  - _Requirements: 2.2, 2.3_
  - _Boundary: isbn.js_

- [x] 3. テストコードを整合させる

- [x] 3.1 isbn13to10 のテストケースとヘルパーエクスポートを削除する
  - isbn.test.js の `describe('isbn13to10', ...)` ブロック（4テストケース）を削除する
  - tests/helpers/load-content-script.js の `Object.assign` から `isbn13to10,` エクスポート行を削除する
  - isbn.test.js に `isbn13to10` への参照が残っていないことを確認する
  - _Requirements: 4.1, 4.2_

- [x] 3.2 widget.test.js の createWidget 呼び出しを更新して全テストを通過させる
  - widget.test.js 内の `fns.createWidget('amazon', '9784873117386')` を `fns.createWidget()` に変更する（4箇所）
  - `npm test` を実行して全テストが成功することを確認する → **177 tests passed**
  - 蔵書確認結果・折りたたみ動作に関するテストが引き続きパスすることを確認する
  - _Requirements: 4.3, 1.4_

- [x] 4. (P) ドキュメントから削除済み機能の記述を取り除く

- [x] 4.1 (P) functional-design.md から isbn13to10 インターフェース行と UC-07 関連記述を削除する
  - Section 2.2 の utils/isbn.js インターフェース表から `isbn13to10` の行を削除する
  - Section 6 のユースケース図（Mermaid）から `UC7` ノードと `UC1 -.->|extends| UC7` 接続線を削除する
  - Section 6 のユースケース詳細表から UC-07 行を削除する
  - Section 7 の画面遷移図（Mermaid）から `Widget_Results --> OtherBookStore : クロスサイトリンク` を削除する
  - Section 8 のワイヤフレームの表示例から「楽天ブックスで見る」表記を削除し、フッター表示例を更新する
  - _Requirements: 5.1, 5.3_
  - _Boundary: docs/functional-design.md_

- [x] 4.2 (P) glossary.md からクロスサイトリンク関連の用語定義と CSS クラス行を削除する
  - UI/UX用語表の「クロスサイトリンク」行を削除する
  - CSSクラス名テーブルの `calil-crosssite-link` 行を削除する
  - _Requirements: 5.2_
  - _Boundary: docs/glossary.md_
