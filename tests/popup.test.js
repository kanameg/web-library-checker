/**
 * Tests for popup.js functions, specifically getStatusInfo(libkey)
 */

const fs = require('fs');
const path = require('path');

// Load popup.js and expose internal functions by replacing the IIFE tail
function loadPopupScript() {
  const filePath = path.resolve(__dirname, '../extension/popup/popup.js');
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace the IIFE end that registers the DOMContentLoaded listener
  // Original tail: `  document.addEventListener('DOMContentLoaded', init);\n})();\n`
  code = code.replace(
    "  document.addEventListener('DOMContentLoaded', init);\n})();",
    `  return {
    getStatusInfo,
    sanitizeText,
    sanitizeUrl,
  };
})();`
  );

  // eslint-disable-next-line no-eval
  return eval(code);
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
