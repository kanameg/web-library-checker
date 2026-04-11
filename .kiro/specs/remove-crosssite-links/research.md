# Research & Design Decisions — remove-crosssite-links

---

## Summary

- **Feature**: `remove-crosssite-links`
- **Discovery Scope**: Simple Addition（既存機能の削除・クリーンアップ）
- **Key Findings**:
  - `buildCrossSiteLink(site, isbn)` の削除に伴い、`createWidget` の引数 `site` と `isbn` がいずれも不要になる（他の用途なし）
  - `isbn13to10` はクロスサイトリンク生成のみで使用されており、`isbn.js` 内の他関数からも参照されていない
  - UC-07 参照は `functional-design.md` の Section 6（ユースケース図・詳細表）・Section 7（画面遷移図）・Section 8（ワイヤフレーム）に分散している。`product-requirements.md` には UC-07 の明示的な記述はなく、Requirement 5.3 の「削除または更新」対象は `functional-design.md` に修正が必要

---

## Research Log

### createWidget シグネチャの変更範囲

- **Context**: `buildCrossSiteLink(site, isbn)` を削除すると、`createWidget(site, isbn)` 内で `site`・`isbn` の両パラメータが参照されなくなる
- **Sources Consulted**: `extension/content/content_script.js` の直接参照
- **Findings**:
  - `site` は `createWidget` 内で `buildCrossSiteLink` の第1引数としてのみ使用
  - `isbn` は `createWidget` 内で `buildCrossSiteLink` の第2引数としてのみ使用
  - `site` は `insertWidget(widget, site)` でも使用されているが、こちらは `main()` 内で直接渡しているため `createWidget` の引数として保持する必要はない
- **Implications**: `createWidget(site, isbn)` → `createWidget()` へのシグネチャ変更が必要。テストヘルパーの `createWidget` 呼び出しも合わせて確認が必要

### isbn13to10 の依存関係確認

- **Context**: `isbn13to10` が他に使われていないか確認
- **Sources Consulted**: `extension/` ディレクトリ全体の grep
- **Findings**:
  - `extension/utils/isbn.js`: 関数定義のみ（line 36）
  - `extension/content/content_script.js`: `buildCrossSiteLink` 内で1箇所使用（line 36）
  - `tests/isbn.test.js`: テストケース4件（lines 92–108）
  - `tests/helpers/load-content-script.js`: エクスポートに含まれる（line 54）
  - 他コンテキスト（popup.js, options.js, service_worker.js）への参照なし

### ドキュメント参照箇所の全量把握

- **Context**: docs/ 内のすべての参照を削除漏れなく把握する
- **Sources Consulted**: `docs/` ディレクトリの grep（isbn13to10, calil-crosssite-link, UC-07, クロスサイトリンク, OtherBookStore）
- **Findings**:
  - `docs/functional-design.md` line 137: `isbn13to10` 行（Section 2.2 isbn.js インターフェース表）
  - `docs/functional-design.md` line 526: `UC7["UC-07\n他の書店で同じ本を確認する"]`（Section 6 ユースケース図）
  - `docs/functional-design.md` line 533: ユースケース図の `UC1 -.->|extends| UC7` 接続線
  - `docs/functional-design.md` line 553: UC-07 の詳細行（Section 6 ユースケース詳細表）
  - `docs/functional-design.md` line 573: `Widget_Results --> OtherBookStore : クロスサイトリンク`（Section 7 画面遷移図）
  - `docs/functional-design.md` line 615: フッターのワイヤフレーム例（Section 8）
  - `docs/glossary.md` line 51: `クロスサイトリンク` の用語定義行
  - `docs/glossary.md` line 131: `calil-crosssite-link` CSSクラス行
  - `docs/product-requirements.md`: UC-07 の明示的な記述は存在しない

---

## Architecture Pattern Evaluation

| オプション | 説明 | 長所 | 短所 | 判定 |
|-----------|------|------|------|------|
| 削除のみ（最小変更） | `buildCrossSiteLink` と呼び出し箇所のみ削除 | 変更量が最小 | `createWidget` に使われない引数が残る | ✗ 非推奨 |
| 削除 + シグネチャ整合 | `buildCrossSiteLink` を削除し `createWidget(site, isbn)` も `createWidget()` に整理 | コードが清潔 | テストヘルパーの確認が必要 | ✓ 採用 |

---

## Design Decisions

### Decision: `createWidget` シグネチャを引数なしに変更する

- **Context**: `buildCrossSiteLink` 削除後、`site` と `isbn` が `createWidget` 内で未使用になる
- **Alternatives Considered**:
  1. 引数を残す — 将来への準備として保持するが、未使用引数は混乱を招く
  2. 引数を削除する — コードの意図が明確になり、不要な引数が排除される
- **Selected Approach**: `createWidget()` に変更し、`main()` 内の呼び出し元も更新する
- **Rationale**: 未使用引数はコードの可読性を下げ、将来の実装者を混乱させる可能性がある
- **Trade-offs**: テストが `createWidget` を直接呼ぶ場合は変更が必要（現状はヘルパー経由でエクスポート済み）
- **Follow-up**: `tests/content_script.test.js` で `createWidget` を直接呼んでいる箇所があれば確認する

---

## Risks & Mitigations

- `createWidget` のシグネチャ変更によりテストが壊れるリスク — テストヘルパーは `createWidget` をエクスポートしているため、テスト側の呼び出し方を確認・修正する
- ドキュメントの削除漏れ — research.md の参照箇所リストをタスクのチェックリストとして使用する

---

## References

- `extension/content/content_script.js` — 変更対象のメインファイル
- `extension/utils/isbn.js` — `isbn13to10` 定義ファイル
- `tests/isbn.test.js` — `isbn13to10` テストケース（lines 92–108）
- `tests/helpers/load-content-script.js` — エクスポート定義（line 54）
