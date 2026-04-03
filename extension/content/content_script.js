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

  function isAmazonBookPage() {
    if (!/\/dp\/[A-Z0-9]{10}/i.test(location.href)) return false;
    const hasDetail = document.querySelector(
      '#detail-bullets, #productDetailsTable, #detailBullets_feature_div, ' +
      '#rpi-attribute-book_details-isbn13, #rpi-attribute-book_details-isbn10'
    );
    if (!hasDetail) return false;
    return document.body.innerText.includes('ISBN-10') || document.body.innerText.includes('ISBN-13');
  }

  function isRakutenBookPage() {
    // URLパターンのみで判定（DOM構造への依存を排除）
    return /^https:\/\/books\.rakuten\.co\.jp\/rb\/\d+/.test(location.href);
  }

  function extractIsbnFromRakuten() {
    // 1. メタタグ（楽天ブックスは <meta property="books:isbn"> を静的に出力する）
    for (const selector of ['meta[property="books:isbn"]', 'meta[name="isbn"]']) {
      const meta = document.querySelector(selector);
      if (meta) {
        const isbn = toIsbn13(meta.getAttribute('content'));
        if (isbn) return isbn;
      }
    }

    // 2. ページ内の全 th/dt ペアから「ISBN」ラベルに対応する値を抽出
    const ths = document.querySelectorAll('th, dt');
    for (const th of ths) {
      if (th.textContent.includes('ISBN')) {
        const td = th.nextElementSibling;
        if (td) {
          const isbn = toIsbn13(td.textContent.trim());
          if (isbn) return isbn;
        }
      }
    }

    // 3. ページ本文のテキストから ISBN-13 / ISBN-10 パターンを検索
    const bodyText = document.body.innerText;
    const m13 = bodyText.match(/ISBN[：:\s]*(97[89][-\d]{10,17})/);
    if (m13) {
      const isbn = toIsbn13(m13[1]);
      if (isbn) return isbn;
    }
    const m10 = bodyText.match(/ISBN[：:\s]*([0-9]{9}[0-9X])/);
    if (m10) {
      const isbn = toIsbn13(m10[1]);
      if (isbn) return isbn;
    }

    // 4. URL末尾の数値ID (/rb/1234567890/)
    const pathMatch = location.pathname.match(/\/rb\/(\d{9,13})\/?/);
    if (pathMatch) {
      const isbn = toIsbn13(pathMatch[1]);
      if (isbn) return isbn;
    }

    return null;
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

  function insertWidget(widget, site) {
    if (site === 'rakuten') {
      // クーポンエリアの直前（価格・ポイントの直後）
      const couponArea = document.querySelector('#itemCouponArea');
      if (couponArea) { couponArea.insertAdjacentElement('beforebegin', widget); return; }
      // フォールバック: 商品情報セクション（発売日・出版社・ISBN）の直前
      const productDesc = document.querySelector('#productDetailedDescription');
      if (productDesc) { productDesc.insertAdjacentElement('beforebegin', widget); return; }
      // フォールバック: 中央ペイン末尾
      const main = document.querySelector('#main');
      if (main) { main.appendChild(widget); return; }
      document.body.appendChild(widget);
      return;
    } else {
      // Amazon: 詳細情報（ISBN・出版社・ページ数）の直後
      const richInfo = document.querySelector('#richProductInformation_feature_div');
      if (richInfo) { richInfo.insertAdjacentElement('afterend', widget); return; }
      // フォールバック: 旧形式の詳細情報の直後
      const detailBullets = document.querySelector('#detailBullets_feature_div');
      if (detailBullets) { detailBullets.insertAdjacentElement('afterend', widget); return; }
      // フォールバック: 内容紹介の直後
      const bookDesc = document.querySelector('#bookDescription_feature_div');
      if (bookDesc) { bookDesc.insertAdjacentElement('afterend', widget); return; }
      // フォールバック: 中央カラム末尾 → ページコンテナ
      const col = document.querySelector('#centerCol, #ppd, #dp');
      if (col) { col.appendChild(widget); return; }
      document.body.appendChild(widget);
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

  function getBranchIconClass(status) {
    if (status === '貸出可') return 'available';
    if (status === '貸出中') return 'on-loan';
    if (status === '休館中') return 'none';
    return 'other';
  }

  function setWidgetResults(widget, results) {
    const body = widget.querySelector('.calil-body');
    if (!results || results.length === 0) {
      body.innerHTML = '<div class="calil-no-stock">蔵書情報を取得できませんでした</div>';
      return;
    }

    const blocks = results.map(({ library, result, error }) => {
      const systemName = sanitizeText(library.name);

      if (error) {
        return `
          <div class="calil-system-block">
            <div class="calil-system-header"><span class="calil-system-name">${systemName}</span></div>
            <div class="calil-branch-row">
              <span class="calil-status-icon error"></span>
              <span class="calil-branch-status calil-error">確認に失敗しました</span>
            </div>
          </div>
        `;
      }

      const reserveUrl = result?.reserveurl ? sanitizeUrl(result.reserveurl) : null;
      const reserveLink = reserveUrl && reserveUrl !== '#'
        ? `<a href="${reserveUrl}" target="_blank" rel="noopener noreferrer" class="calil-reserve-link">予約する</a>`
        : '';

      if (!result || result.status === 'Error' || !result.libkey || Object.keys(result.libkey).length === 0) {
        return `
          <div class="calil-system-block">
            <div class="calil-system-header"><span class="calil-system-name">${systemName}</span>${reserveLink}</div>
            <div class="calil-branch-row">
              <span class="calil-status-icon none"></span>
              <span class="calil-branch-status calil-no-stock">この図書館には蔵書がありません</span>
            </div>
          </div>
        `;
      }

      const branchRows = Object.entries(result.libkey).map(([branchName, status]) => {
        const iconClass = getBranchIconClass(status);
        return `
          <div class="calil-branch-row">
            <span class="calil-status-icon ${iconClass}"></span>
            <span class="calil-branch-name">${sanitizeText(branchName)}</span>
            <span class="calil-branch-status ${iconClass}">${sanitizeText(status)}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="calil-system-block">
          <div class="calil-system-header"><span class="calil-system-name">${systemName}</span>${reserveLink}</div>
          ${branchRows}
        </div>
      `;
    });

    body.innerHTML = blocks.join('');
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
    // サイト判定とISBN抽出
    let site = null;
    let isbn = null;

    if (isAmazonBookPage()) {
      site = 'amazon';
      isbn = extractIsbnFromPage();
    } else if (isRakutenBookPage()) {
      site = 'rakuten';
      isbn = extractIsbnFromRakuten();
    }

    // 書籍ページ・ISBN未取得なら終了
    if (!site || !isbn) return;

    // ウィジェット挿入
    const widget = createWidget();
    insertWidget(widget, site);
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
      let isbn = null;
      let isBookPage = false;
      if (isAmazonBookPage()) {
        isBookPage = true;
        isbn = extractIsbnFromPage();
      } else if (isRakutenBookPage()) {
        isBookPage = true;
        isbn = extractIsbnFromRakuten();
      }
      sendResponse({ isBookPage, isbn });
      return false;
    }
  });

  main();
})();
