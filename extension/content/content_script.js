/**
 * コンテンツスクリプト
 * Amazonの書籍ページに蔵書確認ウィジェットを挿入する
 *
 * 依存スクリプト (manifest.json の js 配列でこのファイルより前に読み込むこと):
 *   - utils/isbn.js    : toIsbn13, extractIsbnFromPage, extractIsbnFromRakuten
 *   - utils/sanitize.js: sanitizeText, sanitizeUrl
 *   - utils/status.js  : getStatusClass
 */

(function () {
  'use strict';

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

  // --- ウィジェット構築 ---
  function buildCrossSiteLink(site, isbn) {
    if (site === 'amazon') {
      const url = sanitizeUrl(`https://books.rakuten.co.jp/search/?sitem=${isbn}`);
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="calil-crosssite-link">楽天ブックスで見る</a>`;
    }
    if (site === 'rakuten') {
      const isbn10 = isbn13to10(isbn);
      const url = isbn10
        ? sanitizeUrl(`https://www.amazon.co.jp/dp/${isbn10}`)
        : sanitizeUrl(`https://www.amazon.co.jp/s?k=${isbn}`);
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="calil-crosssite-link">Amazonで見る</a>`;
    }
    return null;
  }

  function createWidget(site, isbn) {
    const wrapper = document.createElement('div');
    wrapper.id = 'calil-library-checker';
    wrapper.innerHTML = `
      <div class="calil-header">
        <span class="calil-header-icon">📚</span>
        図書館蔵書チェッカー
        <button type="button" class="calil-toggle-btn" aria-expanded="true" title="折りたたむ">▲</button>
      </div>
      <div class="calil-body"></div>
      <div class="calil-footer">
        <a href="#" id="calil-settings-link">設定を変更</a>
        <a href="https://calil.jp/" target="_blank" rel="noopener noreferrer">Powered by カーリル</a>
      </div>
    `;

    const crossLink = buildCrossSiteLink(site, isbn);
    if (crossLink) {
      wrapper.querySelector('.calil-footer').insertAdjacentHTML('afterbegin', crossLink);
    }

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

  function setWidgetResults(widget, results) {
    const body = widget.querySelector('.calil-body');
    if (!results || results.length === 0) {
      body.innerHTML = '<div class="calil-no-stock">蔵書情報を取得できませんでした</div>';
      return;
    }

    const blocks = results.map(({ library, result, error }) => {
      const systemName = sanitizeText(library.systemname || library.name);

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
        const iconClass = getStatusClass(status);
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

  // --- 折りたたみ動作 ---
  function initToggleBehavior(widget) {
    const btn = widget.querySelector('.calil-toggle-btn');
    const body = widget.querySelector('.calil-body');
    const footer = widget.querySelector('.calil-footer');
    if (!btn || !body || !footer) return;

    // localStorage から初期状態を復元
    if (loadToggleState()) {
      body.style.display = 'none';
      footer.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = '▼';
      btn.title = '展開する';
    }

    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        body.style.display = 'none';
        footer.style.display = 'none';
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = '▼';
        btn.title = '展開する';
        saveToggleState(true);
      } else {
        body.style.display = '';
        footer.style.display = '';
        btn.setAttribute('aria-expanded', 'true');
        btn.textContent = '▲';
        btn.title = '折りたたむ';
        saveToggleState(false);
      }
    });
  }

  // --- 折りたたみ状態の永続化 ---
  function loadToggleState() {
    try {
      return localStorage.getItem('calil_widget_collapsed') === '1';
    } catch {
      return false;
    }
  }

  function saveToggleState(collapsed) {
    try {
      if (collapsed) {
        localStorage.setItem('calil_widget_collapsed', '1');
      } else {
        localStorage.removeItem('calil_widget_collapsed');
      }
    } catch {
      // localStorage が使えない場合は無視
    }
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
    const widget = createWidget(site, isbn);
    insertWidget(widget, site);
    if (!widget.parentElement) return; // 挿入失敗
    initToggleBehavior(widget);

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
