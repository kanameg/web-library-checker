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
  const filePath = path.resolve(__dirname, '../../content/content_script.js');
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace the IIFE tail that calls main() with a return of all internals
  code = code.replace(
    '  main();\n})();',
    `  return {
    calcIsbn13CheckDigit,
    normalizeIsbn,
    isbn10to13,
    toIsbn13,
    extractAsinFromUrl,
    sanitizeText,
    sanitizeUrl,
    getBranchIconClass,
    setWidgetResults,
    getCacheKey,
    loadFromCache,
    saveToCache,
  };
})();`
  );

  // eslint-disable-next-line no-eval
  return eval(code);
}

module.exports = { loadContentScript };
