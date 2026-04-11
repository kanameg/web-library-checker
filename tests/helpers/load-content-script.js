/**
 * Helper to load content_script.js and expose its internal functions for testing.
 *
 * The content script is wrapped in an IIFE. We strip the wrapper by replacing
 * the final `  main();\n})();` with a return statement that exposes all
 * internal functions, then eval the modified source so all functions are
 * accessible in the jsdom environment (where document, sessionStorage, location,
 * and global.chrome are all available).
 */

const fs = require('fs');
const path = require('path');

function loadContentScript() {
  const isbnCode = fs.readFileSync(
    path.resolve(__dirname, '../../extension/utils/isbn.js'), 'utf8'
  );
  const sanitizeCode = fs.readFileSync(
    path.resolve(__dirname, '../../extension/utils/sanitize.js'), 'utf8'
  );
  const statusCode = fs.readFileSync(
    path.resolve(__dirname, '../../extension/utils/status.js'), 'utf8'
  );
  const filePath = path.resolve(__dirname, '../../extension/content/content_script.js');
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace the IIFE tail that calls main() with a return of all internals
  code = code.replace(
    '  main();\n})();',
    `  return {
    setWidgetResults,
    getCacheKey,
    loadFromCache,
    saveToCache,
    loadToggleState,
    saveToggleState,
    initToggleBehavior,
    createWidget,
  };
})();`
  );

  // isbn.js と sanitize.js のグローバル関数を外側スコープで定義してから
  // content_script.js の IIFE を実行することで依存関係を解決する
  const combined = `(function() {
${isbnCode}
${sanitizeCode}
${statusCode}
const contentExports = ${code}
return Object.assign({
  calcIsbn13CheckDigit,
  normalizeIsbn,
  isbn10to13,
  isbn13to10,
  toIsbn13,
  extractAsinFromUrl,
  extractIsbnFromPage,
  extractIsbnFromRakuten,
  sanitizeText,
  sanitizeUrl,
  getStatusClass,
}, contentExports);
})()`;

  // eslint-disable-next-line no-eval
  return eval(combined);
}

module.exports = { loadContentScript };
