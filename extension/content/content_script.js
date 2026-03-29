/**
 * コンテンツスクリプト
 * Amazonの書籍ページに蔵書確認ウィジェットを挿入する
 */

(function () {
  'use strict';

  // --- ISBN ユーティリティ（インライン） ---

  function calcIsbn13CheckDigit(digits12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3);
    }
    return (10 - (sum % 10)) % 10;
  }

  function isbn10to13(isbn10) {
    const clean = isbn10.replace(/[-\s]/g, '');
    if (!/^\d{9}[\dX]$/.test(clean)) return null;
    const digits = '978' + clean.slice(0, 9);
    const checkDigit = calcIsbn13CheckDigit(digits);
    return digits + checkDigit;
  }

  function normalizeIsbn(isbn) {
    return isbn.replace(/[-\s]/g, '');
  }

  function toIsbn13(isbn) {
    const clean = normalizeIsbn(isbn);
    if (clean.length === 13 && /^\d{13}$/.test(clean)) return clean;
    if (clean.length === 10 && /^\d{9}[\dX]$/.test(clean)) return isbn10to13(clean);
    return null;
  }

  function extractAsinFromUrl(url) {
    const match = url.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
  }

  function extractIsbnFromPage() {
    // 1. URL ASIN
    const asin = extractAsinFromUrl(location.href);
    if (asin && /^\d{10}$/.test(asin)) {
      const isbn13 = toIsbn13(asin);
      if (isbn13) return isbn13;
    }

    // 2. 新形式DOM (ISBN-13)
    const newFormat13 = document.querySelector('#rpi-attribute-book_details-isbn13 .rpi-attribute-value');
    if (newFormat13) {
      const isbn = toIsbn13(newFormat13.textContent.trim());
      if (isbn) return isbn;
    }

    // 新形式DOM (ISBN-10)
    const newFormat10 = document.querySelector('#rpi-attribute-book_details-isbn10 .rpi-attribute-value');
    if (newFormat10) {
      const isbn = toIsbn13(newFormat10.textContent.trim());
      if (isbn) return isbn;
    }

    // 3. 旧形式DOM
    const listItems = document.querySelectorAll(
      '#detail-bullets .content li, #detailBullets_feature_div li'
    );
    for (const li of listItems) {
      const text = li.textContent;
      const m13 = text.match(/ISBN-13[:\s]+([0-9\-]{13,17})/);
      if (m13) { const isbn = toIsbn13(m13[1]); if (isbn) return isbn; }
      const m10 = text.match(/ISBN-10[:\s]+([0-9X\-]{10,14})/);
      if (m10) { const isbn = toIsbn13(m10[1]); if (isbn) return isbn; }
    }

    // 4. メタタグ
    const metaIsbn = document.querySelector('meta[name="books:isbn"]');
    if (metaIsbn) {
      const isbn = toIsbn13(metaIsbn.getAttribute('content'));
      if (isbn) return isbn;
    }

    return null;
  }

  function isBookPage() {
    if (!/amazon\.co\.jp\/([\w%-]+\/)?dp\//.test(location.href)) return false;
    const hasDetail =
      document.querySelector('#detail-bullets') ||
      document.querySelector('#productDetailsTable') ||
      document.querySelector('#detailBullets_feature_div') ||
      document.querySelector('#rpi-attribute-book_details-isbn13') ||
      document.querySelector('#rpi-attribute-book_details-isbn10');
    if (!hasDetail) return false;
    return document.body.innerText.includes('ISBN-10') || document.body.innerText.includes('ISBN-13');
  }

  // --- DOM サニタイズ ---
  function sanitizeText(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  function sanitizeUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '#';
      return parsed.href;
    } catch {
      return '#';
    }
  }

  // --- ウィジェット構築 ---
  function createWidget() {
    const wrapper = document.createElement('div');
    wrapper.id = 'calil-library-checker';
    wrapper.innerHTML = `
      <div class="calil-header">
        <span class="calil-header-icon">📚</span>
        図書館蔵書チェッカー
      </div>
      <div class="calil-body"></div>
      <div class="calil-footer">
        <a href="#" id="calil-settings-link">設定を変更</a>
        <a href="https://calil.jp/" target="_blank" rel="noopener noreferrer">Powered by カーリル</a>
      </div>
    `;

    wrapper.querySelector('#calil-settings-link').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    });

    return wrapper;
  }

  function insertWidget(widget) {
    const buybox = document.querySelector('#buybox');
    if (buybox) {
      buybox.insertAdjacentElement('afterend', widget);
      return;
    }
    const centerCol = document.querySelector('#centerCol');
    if (centerCol) {
      centerCol.appendChild(widget);
    }
  }

  function setWidgetLoading(widget) {
    widget.querySelector('.calil-body').innerHTML = `
      <div class="calil-loading">
        <div class="calil-spinner"></div>
        図書館蔵書を確認中...
      </div>
    `;
  }

  function setWidgetSetupRequired(widget) {
    widget.querySelector('.calil-body').innerHTML = `
      <div class="calil-setup-message">
        図書館を設定してください。
        <a href="#" id="calil-open-options">設定画面を開く</a>
      </div>
    `;
    widget.querySelector('#calil-open-options').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    });
  }

  function setWidgetError(widget, message) {
    widget.querySelector('.calil-body').innerHTML = `
      <div class="calil-error">
        <span>⚠️</span> ${sanitizeText(message)}
      </div>
    `;
  }

  function getStatusInfo(libkey) {
    if (!libkey || Object.keys(libkey).length === 0) {
      return { iconClass: 'none', label: '蔵書なし' };
    }

    const statuses = Object.values(libkey);
    if (statuses.includes('貸出可')) return { iconClass: 'available', label: '貸出可' };
    if (statuses.includes('貸出中')) return { iconClass: 'on-loan', label: '貸出中' };
    if (statuses.includes('蔵書なし')) return { iconClass: 'none', label: '蔵書なし' };
    return { iconClass: 'other', label: statuses[0] || '確認中' };
  }

  function setWidgetResults(widget, results) {
    const body = widget.querySelector('.calil-body');
    if (!results || results.length === 0) {
      body.innerHTML = '<div class="calil-no-stock">蔵書情報を取得できませんでした</div>';
      return;
    }

    const rows = results.map(({ library, result, error }) => {
      if (error) {
        return `
          <div class="calil-library-row">
            <span class="calil-status-icon error"></span>
            <span class="calil-lib-name">${sanitizeText(library.name)}</span>
            <span class="calil-lib-status calil-error">確認に失敗しました</span>
          </div>
        `;
      }

      if (!result || result.status === 'Error') {
        return `
          <div class="calil-library-row">
            <span class="calil-status-icon none"></span>
            <span class="calil-lib-name">${sanitizeText(library.name)}</span>
            <span class="calil-lib-status calil-no-stock">この図書館には蔵書がありません</span>
          </div>
        `;
      }

      const libkey = result.libkey || {};
      const { iconClass, label } = getStatusInfo(libkey);
      const reserveUrl = result.reserveurl ? sanitizeUrl(result.reserveurl) : null;

      const reserveLink = reserveUrl && reserveUrl !== '#'
        ? `<a href="${reserveUrl}" target="_blank" rel="noopener noreferrer" class="calil-reserve-link">予約する</a>`
        : '';

      return `
        <div class="calil-library-row">
          <span class="calil-status-icon ${iconClass}"></span>
          <span class="calil-lib-name">${sanitizeText(library.name)}</span>
          <span class="calil-lib-status">${sanitizeText(label)}</span>
          ${reserveLink}
        </div>
      `;
    });

    body.innerHTML = rows.join('');
  }

  // --- セッションキャッシュ ---
  function getCacheKey(isbn, libraries) {
    const systemids = libraries.map(l => l.systemid).sort().join(',');
    return `calil_${isbn}_${systemids}`;
  }

  function loadFromCache(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveToCache(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      // sessionStorage が使えない場合は無視
    }
  }

  // --- メイン処理 ---
  async function main() {
    // 書籍ページでなければ終了
    if (!isBookPage()) return;

    // ISBNが取得できなければ終了
    const isbn = extractIsbnFromPage();
    if (!isbn) return;

    // ウィジェット挿入
    const widget = createWidget();
    insertWidget(widget);
    if (!widget.parentElement) return; // 挿入失敗

    // 設定取得
    let settings;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (!response.success) throw new Error(response.error);
      settings = response.data;
    } catch (err) {
      setWidgetError(widget, '設定の取得に失敗しました');
      return;
    }

    // APIキー未設定
    if (!settings.calil_api_key) {
      setWidgetSetupRequired(widget);
      return;
    }

    // 図書館未設定
    if (!settings.libraries || settings.libraries.length === 0) {
      setWidgetSetupRequired(widget);
      return;
    }

    // キャッシュ確認
    const cacheKey = getCacheKey(isbn, settings.libraries);
    const cached = loadFromCache(cacheKey);
    if (cached) {
      setWidgetResults(widget, cached);
      return;
    }

    // ローディング表示
    setWidgetLoading(widget);

    // API呼び出し
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_LIBRARY',
        payload: { isbn, libraries: settings.libraries },
      });
      if (!response.success) {
        if (response.error === 'api_key_not_set' || response.error === 'no_libraries_set') {
          setWidgetSetupRequired(widget);
        } else {
          setWidgetError(widget, '確認に失敗しました');
        }
        return;
      }
      saveToCache(cacheKey, response.data);
      setWidgetResults(widget, response.data);
    } catch (err) {
      setWidgetError(widget, '確認に失敗しました');
    }
  }

  // ポップアップからの問い合わせに応答
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PAGE_INFO') {
      const bookPage = isBookPage();
      const isbn = bookPage ? extractIsbnFromPage() : null;
      sendResponse({ isBookPage: bookPage, isbn });
      return false;
    }
  });

  main();
})();
