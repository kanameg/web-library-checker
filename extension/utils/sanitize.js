/**
 * DOM サニタイズユーティリティ
 */

/**
 * テキストをHTML安全な文字列に変換
 * @param {*} text
 * @returns {string}
 */
function sanitizeText(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(text)));
  return div.innerHTML;
}

/**
 * URLを検証し、http/https以外は '#' を返す
 * @param {string} url
 * @returns {string}
 */
function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '#';
    return parsed.href;
  } catch {
    return '#';
  }
}
