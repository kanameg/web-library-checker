/**
 * ポップアップスクリプト
 */
(function () {
  'use strict';

  function show(id) {
    document.getElementById(id).classList.remove('hidden');
  }

  function hide(id) {
    document.getElementById(id).classList.add('hidden');
  }

  function getStatusInfo(libkey) {
    if (!libkey || Object.keys(libkey).length === 0) {
      return { dotClass: 'none', label: '蔵書なし' };
    }
    const statuses = Object.values(libkey);
    if (statuses.includes('貸出可')) return { dotClass: 'available', label: '貸出可' };
    if (statuses.includes('貸出中')) return { dotClass: 'on-loan', label: '貸出中' };
    if (statuses.includes('蔵書なし')) return { dotClass: 'none', label: '蔵書なし' };
    return { dotClass: 'other', label: statuses[0] || '確認中' };
  }

  function renderResults(isbn, results) {
    document.getElementById('isbn-display').textContent = `ISBN: ${isbn}`;

    const listEl = document.getElementById('library-list');
    listEl.innerHTML = '';

    results.forEach(({ library, result, error }) => {
      const row = document.createElement('div');
      row.className = 'library-row';

      if (error) {
        row.innerHTML = `
          <span class="status-dot error"></span>
          <span class="lib-name">${sanitizeText(library.name)}</span>
          <span class="lib-status" style="color:#c62828">確認失敗</span>
        `;
      } else if (!result || result.status === 'Error') {
        row.innerHTML = `
          <span class="status-dot none"></span>
          <span class="lib-name">${sanitizeText(library.name)}</span>
          <span class="lib-status" style="color:#888">蔵書なし</span>
        `;
      } else {
        const { dotClass, label } = getStatusInfo(result.libkey);
        const reserveUrl = result.reserveurl ? sanitizeUrl(result.reserveurl) : null;
        const reserveLink = reserveUrl && reserveUrl !== '#'
          ? `<a href="${reserveUrl}" target="_blank" rel="noopener noreferrer" class="reserve-link">予約</a>`
          : '';
        row.innerHTML = `
          <span class="status-dot ${dotClass}"></span>
          <span class="lib-name">${sanitizeText(library.name)}</span>
          <span class="lib-status">${sanitizeText(label)}</span>
          ${reserveLink}
        `;
      }

      listEl.appendChild(row);
    });

    show('results');
  }

  async function init() {
    // 設定ボタン
    document.getElementById('settings-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('open-options-btn')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // アクティブタブを取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isSupportedSite = tab && tab.url && (
      tab.url.includes('amazon.co.jp') ||
      tab.url.includes('books.rakuten.co.jp')
    );
    if (!isSupportedSite) {
      show('not-book-page');
      return;
    }

    // コンテンツスクリプトに現在のISBNと設定を取得してもらう
    let pageInfo;
    try {
      pageInfo = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' });
    } catch {
      show('not-book-page');
      return;
    }

    if (!pageInfo || !pageInfo.isBookPage) {
      show('not-book-page');
      return;
    }

    if (!pageInfo.isbn) {
      show('not-book-page');
      return;
    }

    // 設定取得
    const settingsResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (!settingsResponse.success) {
      show('error-section');
      document.getElementById('error-message').textContent = '設定の取得に失敗しました';
      return;
    }

    const settings = settingsResponse.data;
    if (!settings.calil_api_key || !settings.libraries || settings.libraries.length === 0) {
      show('setup-required');
      return;
    }

    // ローディング
    show('loading');

    // API呼び出し
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_LIBRARY',
        payload: { isbn: pageInfo.isbn, libraries: settings.libraries },
      });

      hide('loading');

      if (!response.success) {
        if (response.error === 'api_key_not_set' || response.error === 'no_libraries_set') {
          show('setup-required');
        } else {
          show('error-section');
          document.getElementById('error-message').textContent = '確認に失敗しました';
        }
        return;
      }

      renderResults(pageInfo.isbn, response.data);
    } catch (err) {
      hide('loading');
      show('error-section');
      document.getElementById('error-message').textContent = '確認に失敗しました';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
