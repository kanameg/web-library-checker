# 実装計画: widget-collapse-toggle

- [x] 1. Foundation: テストインフラストラクチャの準備
- [x] 1.1 テストヘルパーに新規公開関数を追加する
  - `tests/helpers/load-content-script.js` の戻り値オブジェクトに `loadToggleState`・`saveToggleState`・`initToggleBehavior`・`createWidget` を追加する
  - IIFE のテール文字列 `'  main();\n})();'` のパターンを壊さないよう変更箇所を限定する
  - 変更後に既存テスト（`tests/widget.test.js`・`tests/cache.test.js`）がすべてパスすることを確認する
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. コア実装: ストレージ層と CSS スタイル
- [x] 2.1 (P) 折りたたみ状態を localStorage で永続化する関数を実装する
  - `loadToggleState()` 関数を追加する: `localStorage.getItem('calil_widget_collapsed')` が `'1'` ならば `true`、キーがなければ `false` を返す。アクセス失敗時は `false` にフォールバックする
  - `saveToggleState(collapsed)` 関数を追加する: `collapsed` が `true` ならば `localStorage.setItem('calil_widget_collapsed', '1')`、`false` ならば `localStorage.removeItem('calil_widget_collapsed')` を呼び出す。失敗時はサイレントに無視する
  - どちらの関数も try-catch でエラーを捕捉し、例外を外部に伝播させない
  - `loadToggleState()` を単体で呼び出すと格納値に対応した真偽値が返る状態になる
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Boundary: ToggleStateManager_

- [x] 2.2 (P) トグルボタンの CSS スタイルを追加する
  - `content_script.css` に `.calil-toggle-btn` セレクターを追加し、ブラウザのデフォルトボタンスタイル（`background: none`・`border: none`・`padding: 0 4px`）をリセットする
  - `cursor: pointer` を指定し、ホバー時にポインターカーソルが表示されるようにする
  - フォントサイズを既存ヘッダーに合わせた値（例: `14px`）に指定する
  - ブラウザ開発者ツールで `.calil-toggle-btn` を検査したとき、カーソルがポインターに変わることが確認できる状態になる
  - _Requirements: 4.4_
  - _Boundary: ToggleButton CSS_

- [x] 3. UI 統合: ボタン生成と動作実装
- [x] 3.1 createWidget() にトグルボタン要素を追加する
  - `createWidget()` 内の `.calil-header` HTML テンプレートの末尾に `<button type="button" class="calil-toggle-btn" aria-expanded="true" title="折りたたむ">▲</button>` を追加する
  - `.calil-header` が `display: flex` レイアウトであるため、ボタンに `margin-left: auto` 相当のスタイルを与えて右寄せにする（インラインスタイルまたは CSS クラスで対応）
  - `createWidget()` を呼び出したとき、生成された DOM に `.calil-toggle-btn` ボタンが `.calil-header` 内に存在し、`aria-expanded="true"` が設定されている状態になる
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.2, 4.3_

- [x] 3.2 折りたたみ動作ハンドラを実装して main() に統合する
  - `initToggleBehavior(widget)` 関数を追加する
  - 初期化時に `loadToggleState()` を呼び出し、折りたたみ状態が保存されていれば `.calil-body` と `.calil-footer` を `display: none` にし、ボタンの `aria-expanded` を `"false"`・テキストを `▼`・`title` を `"展開する"` に設定する
  - クリックハンドラを追加し、ボタンの `aria-expanded` 現在値を読んで表示状態を反転させる。展開時は `aria-expanded="false"`・アイコン `▼`・`title "展開する"` に更新し `saveToggleState(true)` を呼ぶ。折りたたみ時は逆の更新を行い `saveToggleState(false)` を呼ぶ
  - `main()` の `insertWidget()` 成功確認ガード（`if (!widget.parentElement) return`）の直後に `initToggleBehavior(widget)` の呼び出しを追加する
  - ウィジェットを展開状態でクリックすると `.calil-body` が非表示になり、再クリックで表示に戻る状態になる
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2_
  - _Depends: 2.1, 3.1_

- [x] 4. テスト
- [x] 4.1 ToggleStateManager のユニットテストを追加する
  - `tests/widget.test.js` に `describe('ToggleStateManager')` ブロックを追加する
  - `loadToggleState()` のテスト: `localStorage` に `'1'` があれば `true` を返す / キーがなければ `false` を返す / `localStorage` がエラーを投げても `false` を返す（エラーを throw しない）
  - `saveToggleState(true)` のテスト: `localStorage` に `'calil_widget_collapsed'` キーで `'1'` が保存される
  - `saveToggleState(false)` のテスト: `localStorage` から `'calil_widget_collapsed'` キーが削除される
  - `afterEach` で `localStorage.clear()` を呼び、テスト間の状態汚染を防ぐ
  - `npm test` で追加したすべてのテストケースがパスする状態になる
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4.2 ToggleButton・ToggleBehavior のユニットテストを追加する
  - `createWidget()` のテスト: `.calil-header` 内に `.calil-toggle-btn` ボタンが存在し、初期状態で `aria-expanded="true"` が設定されている
  - `initToggleBehavior()` のテスト: クリック後に `aria-expanded` が `"false"` になり `.calil-body` が非表示になる / 2 回クリックで元の展開状態に戻る
  - localStorage 復元テスト: `localStorage.setItem('calil_widget_collapsed', '1')` 後に `initToggleBehavior()` を呼ぶと、`.calil-body` が非表示かつ `aria-expanded="false"` になる
  - `afterEach` で `localStorage.clear()` と `document.body.innerHTML = ''` をリセットする
  - `npm test` で追加したすべてのテストケースがパスする状態になる
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.5, 3.3, 4.1_
  - _Depends: 1.1_
