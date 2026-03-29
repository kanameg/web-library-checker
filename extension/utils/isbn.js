/**
 * ISBN ユーティリティ
 */

/**
 * ISBN-13 チェックデジット計算
 * @param {string} digits12 - 先頭12桁
 * @returns {number}
 */
function calcIsbn13CheckDigit(digits12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * ISBN-10 → ISBN-13 変換
 * @param {string} isbn10
 * @returns {string|null}
 */
function isbn10to13(isbn10) {
  const clean = isbn10.replace(/[-\s]/g, '');
  if (!/^\d{9}[\dX]$/.test(clean)) return null;
  const digits = '978' + clean.slice(0, 9);
  const checkDigit = calcIsbn13CheckDigit(digits);
  return digits + checkDigit;
}

/**
 * ISBN文字列を正規化（ハイフン・スペース除去）
 * @param {string} isbn
 * @returns {string}
 */
function normalizeIsbn(isbn) {
  return isbn.replace(/[-\s]/g, '');
}

/**
 * ISBN-13 として有効かチェック
 * @param {string} isbn
 * @returns {boolean}
 */
function isValidIsbn13(isbn) {
  const clean = normalizeIsbn(isbn);
  if (!/^\d{13}$/.test(clean)) return false;
  const expected = calcIsbn13CheckDigit(clean.slice(0, 12));
  return parseInt(clean[12]) === expected;
}

/**
 * ISBN-10 として有効かチェック
 * @param {string} isbn
 * @returns {boolean}
 */
function isValidIsbn10(isbn) {
  const clean = normalizeIsbn(isbn);
  if (!/^\d{9}[\dX]$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i]) * (10 - i);
  }
  const last = clean[9] === 'X' ? 10 : parseInt(clean[9]);
  sum += last;
  return sum % 11 === 0;
}

/**
 * 任意のISBN文字列をISBN-13に変換
 * @param {string} isbn
 * @returns {string|null}
 */
function toIsbn13(isbn) {
  const clean = normalizeIsbn(isbn);
  if (clean.length === 13 && isValidIsbn13(clean)) return clean;
  if (clean.length === 10 && isValidIsbn10(clean)) return isbn10to13(clean);
  // チェックデジット無効でも長さが合う場合は変換を試みる
  if (clean.length === 10 && /^\d{9}[\dX]$/.test(clean)) return isbn10to13(clean);
  if (clean.length === 13 && /^\d{13}$/.test(clean)) return clean;
  return null;
}

/**
 * AmazonページのURLからASINを抽出
 * @param {string} url
 * @returns {string|null}
 */
function extractAsinFromUrl(url) {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/);
  return match ? match[1] : null;
}

/**
 * AmazonページのDOMからISBNを抽出
 * @returns {string|null} ISBN-13文字列
 */
function extractIsbnFromPage() {
  // 1. URLのASINから変換
  const asin = extractAsinFromUrl(location.href);
  if (asin && /^\d{10}$/.test(asin)) {
    const isbn13 = toIsbn13(asin);
    if (isbn13) return isbn13;
  }

  // 2. 新形式DOM
  const newFormat = document.querySelector('#rpi-attribute-book_details-isbn13 .rpi-attribute-value');
  if (newFormat) {
    const isbn = toIsbn13(newFormat.textContent.trim());
    if (isbn) return isbn;
  }

  // ISBN-10の新形式
  const newFormat10 = document.querySelector('#rpi-attribute-book_details-isbn10 .rpi-attribute-value');
  if (newFormat10) {
    const isbn = toIsbn13(newFormat10.textContent.trim());
    if (isbn) return isbn;
  }

  // 3. 旧形式DOM: #detail-bullets
  const listItems = document.querySelectorAll('#detail-bullets .content li, #detailBullets_feature_div li');
  for (const li of listItems) {
    const text = li.textContent;
    const isbn13Match = text.match(/ISBN-13[:\s]+([0-9\-]{13,17})/);
    if (isbn13Match) {
      const isbn = toIsbn13(isbn13Match[1]);
      if (isbn) return isbn;
    }
    const isbn10Match = text.match(/ISBN-10[:\s]+([0-9X\-]{10,14})/);
    if (isbn10Match) {
      const isbn = toIsbn13(isbn10Match[1]);
      if (isbn) return isbn;
    }
  }

  // 4. メタタグ
  const metaIsbn = document.querySelector('meta[name="books:isbn"]');
  if (metaIsbn) {
    const isbn = toIsbn13(metaIsbn.getAttribute('content'));
    if (isbn) return isbn;
  }

  return null;
}

/**
 * 書籍ページかどうか判定
 * @returns {boolean}
 */
function isBookPage() {
  // URLチェック
  if (!/amazon\.co\.jp\/([\w-]+\/)?dp\//.test(location.href)) return false;

  // DOM存在チェック
  const hasDetailSection =
    document.querySelector('#detail-bullets') !== null ||
    document.querySelector('#productDetailsTable') !== null ||
    document.querySelector('#detailBullets_feature_div') !== null ||
    document.querySelector('#rpi-attribute-book_details-isbn13') !== null ||
    document.querySelector('#rpi-attribute-book_details-isbn10') !== null;

  if (!hasDetailSection) return false;

  // ISBN-10 or ISBN-13 テキスト存在チェック
  const bodyText = document.body.innerText;
  return bodyText.includes('ISBN-10') || bodyText.includes('ISBN-13');
}
