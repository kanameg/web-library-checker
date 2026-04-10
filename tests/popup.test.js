/**
 * Tests for popup.js functions, specifically getStatusInfo(libkey)
 */

const fs = require('fs');
const path = require('path');

// Load popup.js and expose internal functions by replacing the IIFE tail
function loadPopupScript() {
  const sanitizeCode = fs.readFileSync(
    path.resolve(__dirname, '../extension/utils/sanitize.js'), 'utf8'
  );
  const statusCode = fs.readFileSync(
    path.resolve(__dirname, '../extension/utils/status.js'), 'utf8'
  );
  const filePath = path.resolve(__dirname, '../extension/popup/popup.js');
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace the IIFE end that registers the DOMContentLoaded listener
  // Original tail: `  document.addEventListener('DOMContentLoaded', init);\n})();\n`
  code = code.replace(
    "  document.addEventListener('DOMContentLoaded', init);\n})();",
    `  return {
    getStatusInfo,
    renderResults,
    sanitizeText,
    sanitizeUrl,
  };
})();`
  );

  // ファイル先頭コメントを除いた IIFE 部分だけ取り出す（ASI 回避のため）
  const iife = code.slice(code.indexOf('(function'));

  // sanitize.js のグローバル関数を外側スコープで定義してから popup.js の IIFE を実行する
  const combined = `(function() {
${sanitizeCode}
${statusCode}
return ${iife}
})()`;

  // eslint-disable-next-line no-eval
  return eval(combined);
}

let fns;

beforeAll(() => {
  fns = loadPopupScript();
});

describe('getStatusInfo', () => {
  test('貸出可 takes priority over 貸出中', () => {
    const libkey = { 中央: '貸出可', 多摩: '貸出中' };
    expect(fns.getStatusInfo(libkey)).toEqual({ dotClass: 'available', label: '貸出可' });
  });

  test('貸出中 takes priority over 蔵書なし', () => {
    const libkey = { 中央: '貸出中', 多摩: '蔵書なし' };
    expect(fns.getStatusInfo(libkey)).toEqual({ dotClass: 'on-loan', label: '貸出中' });
  });

  test('蔵書なし when all branches have 蔵書なし', () => {
    const libkey = { 中央: '蔵書なし' };
    expect(fns.getStatusInfo(libkey)).toEqual({ dotClass: 'none', label: '蔵書なし' });
  });

  test('empty object returns none and 蔵書なし', () => {
    expect(fns.getStatusInfo({})).toEqual({ dotClass: 'none', label: '蔵書なし' });
  });

  test('null returns none and 蔵書なし', () => {
    expect(fns.getStatusInfo(null)).toEqual({ dotClass: 'none', label: '蔵書なし' });
  });

  test('館内のみ returns other with そのラベル', () => {
    const libkey = { 中央: '館内のみ' };
    expect(fns.getStatusInfo(libkey)).toEqual({ dotClass: 'other', label: '館内のみ' });
  });

  test('予約中 returns other with そのラベル', () => {
    const libkey = { 中央: '予約中' };
    expect(fns.getStatusInfo(libkey)).toEqual({ dotClass: 'other', label: '予約中' });
  });

  test('multiple branches all 蔵書なし returns none', () => {
    const libkey = { 中央: '蔵書なし', 北: '蔵書なし', 南: '蔵書なし' };
    expect(fns.getStatusInfo(libkey)).toEqual({ dotClass: 'none', label: '蔵書なし' });
  });

  test('貸出可 takes priority over 館内のみ', () => {
    const libkey = { 北: '館内のみ', 南: '貸出可' };
    expect(fns.getStatusInfo(libkey)).toEqual({ dotClass: 'available', label: '貸出可' });
  });

  test('貸出中 takes priority over 館内のみ', () => {
    const libkey = { 北: '館内のみ', 南: '貸出中' };
    expect(fns.getStatusInfo(libkey)).toEqual({ dotClass: 'on-loan', label: '貸出中' });
  });

  test('single branch with 貸出可 returns available', () => {
    const libkey = { 中央: '貸出可' };
    expect(fns.getStatusInfo(libkey)).toEqual({ dotClass: 'available', label: '貸出可' });
  });

  test('single branch with 貸出中 returns on-loan', () => {
    const libkey = { 中央: '貸出中' };
    expect(fns.getStatusInfo(libkey)).toEqual({ dotClass: 'on-loan', label: '貸出中' });
  });
});

// ---------------------------------------------------------------------------
// renderResults - システム名称表示テスト（要件 4.2, 4.3）
// ---------------------------------------------------------------------------

describe('renderResults - 図書館名の表示', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="isbn-display"></div>
      <div id="library-list"></div>
      <div id="results" class="hidden"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('systemname が存在する場合は lib-name に systemname を表示する', () => {
    fns.renderResults('9784873117386', [
      {
        library: { name: '東京都立図書館', systemname: '東京都立', systemid: 'Tokyo_Pref' },
        result: { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' },
        error: null,
      },
    ]);

    const libName = document.querySelector('.lib-name');
    expect(libName.textContent).toBe('東京都立');
  });

  test('systemname が存在しない旧データの場合は name にフォールバックする', () => {
    fns.renderResults('9784873117386', [
      {
        library: { name: '東京都立図書館', systemid: 'Tokyo_Pref' },
        result: { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' },
        error: null,
      },
    ]);

    const libName = document.querySelector('.lib-name');
    expect(libName.textContent).toBe('東京都立図書館');
  });

  test('systemname が空文字の場合は name にフォールバックする', () => {
    fns.renderResults('9784873117386', [
      {
        library: { name: '大阪府立図書館', systemname: '', systemid: 'Osaka_Pref' },
        result: { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' },
        error: null,
      },
    ]);

    const libName = document.querySelector('.lib-name');
    expect(libName.textContent).toBe('大阪府立図書館');
  });

  test('error 行でも systemname を表示する', () => {
    fns.renderResults('9784873117386', [
      {
        library: { name: '東京都立図書館', systemname: '東京都立', systemid: 'Tokyo_Pref' },
        result: null,
        error: 'network error',
      },
    ]);

    const libName = document.querySelector('.lib-name');
    expect(libName.textContent).toBe('東京都立');
  });

  test('蔵書なし行でも systemname を表示する', () => {
    fns.renderResults('9784873117386', [
      {
        library: { name: '東京都立図書館', systemname: '東京都立', systemid: 'Tokyo_Pref' },
        result: { status: 'Error', libkey: null, reserveurl: '' },
        error: null,
      },
    ]);

    const libName = document.querySelector('.lib-name');
    expect(libName.textContent).toBe('東京都立');
  });

  test('複数館で各行のシステム名称を表示する', () => {
    fns.renderResults('9784873117386', [
      {
        library: { name: '東京都立図書館', systemname: '東京都立', systemid: 'Tokyo_Pref' },
        result: { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' },
        error: null,
      },
      {
        library: { name: '大阪府立中央図書館', systemname: '大阪府立', systemid: 'Osaka_Pref' },
        result: { status: 'OK', libkey: { '本館': '貸出中' }, reserveurl: '' },
        error: null,
      },
    ]);

    const libNames = document.querySelectorAll('.lib-name');
    expect(libNames[0].textContent).toBe('東京都立');
    expect(libNames[1].textContent).toBe('大阪府立');
  });
});
