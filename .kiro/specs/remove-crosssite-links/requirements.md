# Requirements Document

## Project Description (Input)
Amazonと楽天ブックスの相互リンクを削除

## Introduction

本仕様は、図書館蔵書チェッカーの書籍ページウィジェットフッターに表示されている「Amazonで見る」「楽天ブックスで見る」のクロスサイトリンクを削除する変更を対象とする。

## Boundary Context

- **In scope**: ウィジェットフッターからクロスサイトリンクを削除すること、それに付随する未使用コード（`isbn13to10` 関数）・CSS・テスト・ドキュメントの整合を保つこと
- **Out of scope**: 蔵書確認機能・ポップアップ・設定ページの動作変更、「設定を変更」リンクや「Powered by カーリル」リンクへの影響
- **Adjacent expectations**: `docs/` ドキュメントは前工程で `isbn13to10` 関数の追記が行われており、本変更と合わせて整合を取る

## Requirements

### Requirement 1: ウィジェットフッターからクロスサイトリンクを削除する

**Objective:** As a 拡張機能ユーザー, I want ウィジェットに他書店へのリンクが表示されないこと, so that ウィジェットの用途（図書館蔵書確認）に集中したシンプルな表示になる

#### Acceptance Criteria

1. When Amazon.co.jp の書籍ページを表示したとき, the コンテンツスクリプト shall ウィジェットフッターに「楽天ブックスで見る」リンクを表示しない
2. When 楽天ブックスの書籍ページを表示したとき, the コンテンツスクリプト shall ウィジェットフッターに「Amazonで見る」リンクを表示しない
3. The コンテンツスクリプト shall ウィジェットフッターに「設定を変更」リンクをフッター左端に、「Powered by カーリル」リンクを引き続き表示する
4. The コンテンツスクリプト shall クロスサイトリンク削除後もウィジェットの蔵書確認結果・折りたたみ動作に影響を与えない

---

### Requirement 2: クロスサイトリンク生成に関連する未使用コードを削除する

**Objective:** As a 開発者, I want クロスサイトリンクのためだけに存在するコードを除去すること, so that コードベースに不要な関数が残らない

#### Acceptance Criteria

1. The コンテンツスクリプト shall `buildCrossSiteLink` 関数を含まない
2. The isbn.js モジュール shall `isbn13to10` 関数を含まない（当該関数はクロスサイトリンク生成のみで使用されており、他の箇所からは参照されていない）
3. The コンテンツスクリプト shall `isbn13to10` を呼び出していない

---

### Requirement 3: 関連するCSSスタイルを削除する

**Objective:** As a 開発者, I want クロスサイトリンクに対応するCSSクラスを除去すること, so that 不要なスタイル定義がスタイルシートに残らない

#### Acceptance Criteria

1. The コンテンツスクリプトのスタイルシート shall `.calil-crosssite-link` のスタイル定義を含まない

---

### Requirement 4: テストコードを整合させる

**Objective:** As a 開発者, I want 削除した関数に対応するテストを除去すること, so that 存在しない機能のテストがテストスイートに残らない

#### Acceptance Criteria

1. The テストスイート shall `isbn13to10` 関数のテストケース（`describe('isbn13to10', ...)` ブロック）を含まない
2. The テストヘルパー shall `isbn13to10` 関数のエクスポートを含まない
3. When `npm test` を実行したとき, the テストスイート shall 全テストが成功する

---

### Requirement 5: ドキュメントの整合を保つ

**Objective:** As a 開発者, I want docs/ 以下のドキュメントをコードの実態に合わせること, so that ドキュメントと実装の間に乖離が生じない

#### Acceptance Criteria

1. The `docs/functional-design.md` shall `isbn13to10` 関数を utils/isbn.js の公開インターフェース表に含まない
2. The `docs/glossary.md` shall `calil-crosssite-link` CSSクラスの定義を含まない
3. The `docs/product-requirements.md` shall クロスサイトリンク（UC-07）に関する記述を削除または「削除済み」として更新する
