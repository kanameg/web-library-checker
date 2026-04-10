/**
 * Tests for options.js: renderSearchResults, library selection, and saved data schema
 */

const fs = require('fs');
const path = require('path');

function loadOptionsScript() {
  // 必要な DOM 要素を設定
  document.body.innerHTML = `
    <input id="api-key-input" value="" />
    <button id="save-api-key-btn"></button>
    <span id="api-key-status" class="hidden"></span>
    <select id="pref-select"></select>
    <input id="city-input" value="" />
    <button id="search-btn"></button>
    <div id="search-loading" class="hidden"></div>
    <div id="search-error" class="hidden"></div>
    <div id="search-results" class="hidden">
      <span class="results-count"></span>
      <div id="search-results-list"></div>
    </div>
    <div id="selected-libraries"></div>
    <span id="selected-count">0</span>
    <button id="save-libraries-btn"></button>
    <span id="save-status" class="hidden"></span>
  `;

  const sanitizeCode = fs.readFileSync(
    path.resolve(__dirname, '../extension/utils/sanitize.js'),
    'utf8'
  );

  let code = fs.readFileSync(
    path.resolve(__dirname, '../extension/options/options.js'),
    'utf8'
  );

  // DOMContentLoaded リスナー登録を内部関数の返却に置き換え
  code = code.replace(
    "  document.addEventListener('DOMContentLoaded', init);\n})();",
    `  return {
    renderSearchResults,
    getSelectedLibraries: () => selectedLibraries,
  };
})();`
  );

  const iife = code.slice(code.indexOf('(function'));

  const combined = `(function() {
${sanitizeCode}
return ${iife}
})()`;

  // eslint-disable-next-line no-eval
  return eval(combined);
}

// ---------------------------------------------------------------------------
// 検索結果の正式名称表示（要件 1.1, 1.2, 1.3）
// ---------------------------------------------------------------------------

describe('renderSearchResults - 図書館名の表示', () => {
  let fns;

  beforeEach(() => {
    fns = loadOptionsScript();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('formal_name が存在する場合に館名として formal_name を表示する', () => {
    fns.renderSearchResults([
      {
        systemid: 'Tokyo_Pref',
        systemname: '東京都立',
        formal_name: '東京都立図書館',
        pref: '東京都',
        city: '',
      },
    ]);

    const nameEl = document.querySelector('.library-item-name');
    expect(nameEl.textContent).toBe('東京都立図書館');
  });

  test('formal_name が空文字の場合に systemname をフォールバックとして表示する', () => {
    fns.renderSearchResults([
      {
        systemid: 'Tokyo_Pref',
        systemname: '東京都立',
        formal_name: '',
        pref: '東京都',
        city: '',
      },
    ]);

    const nameEl = document.querySelector('.library-item-name');
    expect(nameEl.textContent).toBe('東京都立');
  });

  test('formal_name が null の場合に systemname をフォールバックとして表示する', () => {
    fns.renderSearchResults([
      {
        systemid: 'Osaka_Pref',
        systemname: '大阪府立',
        formal_name: null,
        pref: '大阪府',
        city: '',
      },
    ]);

    const nameEl = document.querySelector('.library-item-name');
    expect(nameEl.textContent).toBe('大阪府立');
  });

  test('結果が空配列の場合は「図書館が見つかりませんでした」を表示する', () => {
    fns.renderSearchResults([]);

    const list = document.getElementById('search-results-list');
    expect(list.textContent).toContain('図書館が見つかりませんでした');
  });
});

// ---------------------------------------------------------------------------
// 選択済みリスト（要件 2.1, 2.2）
// ---------------------------------------------------------------------------

describe('renderSearchResults - 選択済みリストの表示', () => {
  let fns;

  beforeEach(() => {
    fns = loadOptionsScript();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('チェックボックスを選択すると選択済みリストに同じ館名が表示される', () => {
    fns.renderSearchResults([
      {
        systemid: 'Tokyo_Pref',
        systemname: '東京都立',
        formal_name: '東京都立図書館',
        pref: '東京都',
        city: '',
      },
    ]);

    const checkbox = document.getElementById('lib-Tokyo_Pref');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    const selectedItems = document.querySelectorAll('#selected-libraries .library-item-name');
    expect(selectedItems).toHaveLength(1);
    expect(selectedItems[0].textContent).toBe('東京都立図書館');
  });
});

// ---------------------------------------------------------------------------
// 保存データのスキーマ（要件 3.1, 3.2, 4.4）
// ---------------------------------------------------------------------------

describe('図書館選択時の保存データスキーマ', () => {
  let fns;

  beforeEach(() => {
    fns = loadOptionsScript();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('選択した図書館の保存データに systemname フィールドが含まれる', () => {
    fns.renderSearchResults([
      {
        systemid: 'Tokyo_Pref',
        systemname: '東京都立',
        formal_name: '東京都立図書館',
        pref: '東京都',
        city: '',
      },
    ]);

    const checkbox = document.getElementById('lib-Tokyo_Pref');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    const selected = fns.getSelectedLibraries();
    expect(selected).toHaveLength(1);
    expect(selected[0].systemname).toBe('東京都立');
  });

  test('name フィールドには formal_name が格納される', () => {
    fns.renderSearchResults([
      {
        systemid: 'Tokyo_Pref',
        systemname: '東京都立',
        formal_name: '東京都立図書館',
        pref: '東京都',
        city: '',
      },
    ]);

    const checkbox = document.getElementById('lib-Tokyo_Pref');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    const selected = fns.getSelectedLibraries();
    expect(selected[0].name).toBe('東京都立図書館');
  });

  test('formal_name が空の場合、name は systemname にフォールバックし systemname フィールドも保持される', () => {
    fns.renderSearchResults([
      {
        systemid: 'Osaka_Pref',
        systemname: '大阪府立',
        formal_name: '',
        pref: '大阪府',
        city: '',
      },
    ]);

    const checkbox = document.getElementById('lib-Osaka_Pref');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    const selected = fns.getSelectedLibraries();
    expect(selected[0].name).toBe('大阪府立');
    expect(selected[0].systemname).toBe('大阪府立');
  });

  test('systemname が undefined の場合、systemname フィールドは空文字で保存される', () => {
    fns.renderSearchResults([
      {
        systemid: 'Kyoto_Pref',
        systemname: undefined,
        formal_name: '京都府立図書館',
        pref: '京都府',
        city: '',
      },
    ]);

    const checkbox = document.getElementById('lib-Kyoto_Pref');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    const selected = fns.getSelectedLibraries();
    expect(selected[0].systemname).toBe('');
  });

  test('name フィールドの値はサニタイズ前の元文字列である（ストレージとサニタイズを分離）', () => {
    fns.renderSearchResults([
      {
        systemid: 'Test_Lib',
        systemname: 'テスト図書館',
        formal_name: 'テスト正式図書館',
        pref: '東京都',
        city: '',
      },
    ]);

    const checkbox = document.getElementById('lib-Test_Lib');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    const selected = fns.getSelectedLibraries();
    // name は HTML エンティティに変換されていないこと
    expect(selected[0].name).toBe('テスト正式図書館');
    expect(selected[0].name).not.toContain('&');
  });
});
