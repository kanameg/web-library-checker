/**
 * 設定ページスクリプト
 */
(function () {
  'use strict';

  const MAX_LIBRARIES = 5;

  // 現在選択中の図書館リスト
  let selectedLibraries = [];

  // --- DOM 要素 ---
  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiKeyBtn = document.getElementById('save-api-key-btn');
  const apiKeyStatus = document.getElementById('api-key-status');
  const prefSelect = document.getElementById('pref-select');
  const cityInput = document.getElementById('city-input');
  const searchBtn = document.getElementById('search-btn');
  const searchLoading = document.getElementById('search-loading');
  const searchError = document.getElementById('search-error');
  const searchResults = document.getElementById('search-results');
  const searchResultsList = document.getElementById('search-results-list');
  const selectedLibrariesEl = document.getElementById('selected-libraries');
  const selectedCountEl = document.getElementById('selected-count');
  const saveLibrariesBtn = document.getElementById('save-libraries-btn');
  const saveStatus = document.getElementById('save-status');

  // --- ユーティリティ ---
  function showStatus(el, message, type) {
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3000);
  }

  // --- APIキー保存 ---
  saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    chrome.storage.sync.set({ calil_api_key: key }, () => {
      if (chrome.runtime.lastError) {
        showStatus(apiKeyStatus, '保存に失敗しました', 'error');
      } else {
        showStatus(apiKeyStatus, '保存しました', 'success');
      }
    });
  });

  // --- 図書館検索 ---
  searchBtn.addEventListener('click', async () => {
    const pref = prefSelect.value;
    const appkey = apiKeyInput.value.trim();

    if (!appkey) {
      searchError.textContent = 'APIキーを入力してください';
      searchError.classList.remove('hidden');
      return;
    }

    if (!pref) {
      searchError.textContent = '都道府県を選択してください';
      searchError.classList.remove('hidden');
      return;
    }

    searchError.classList.add('hidden');
    searchResults.classList.add('hidden');
    searchLoading.classList.remove('hidden');
    searchBtn.disabled = true;

    try {
      const city = cityInput.value.trim();
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_LIBRARIES',
        payload: { pref, city, appkey },
      });

      if (!response.success) {
        throw new Error(response.error === 'api_key_not_set'
          ? 'APIキーを入力してください'
          : `検索に失敗しました（${response.error}）`);
      }

      renderSearchResults(response.data);
    } catch (err) {
      searchError.textContent = err.message || '検索に失敗しました';
      searchError.classList.remove('hidden');
    } finally {
      searchLoading.classList.add('hidden');
      searchBtn.disabled = false;
    }
  });

  function renderSearchResults(libraries) {
    if (!libraries || libraries.length === 0) {
      searchResultsList.innerHTML = '<p class="empty-message">図書館が見つかりませんでした</p>';
      searchResults.querySelector('.results-count').textContent = '0件';
      searchResults.classList.remove('hidden');
      return;
    }

    searchResults.querySelector('.results-count').textContent = `${libraries.length}件見つかりました`;
    searchResultsList.innerHTML = '';

    libraries.forEach(lib => {
      const isSelected = selectedLibraries.some(s => s.systemid === lib.systemid);
      const isDisabled = !isSelected && selectedLibraries.length >= MAX_LIBRARIES;

      const item = document.createElement('div');
      item.className = 'library-item';
      item.innerHTML = `
        <input type="checkbox" id="lib-${sanitizeText(lib.systemid)}"
          ${isSelected ? 'checked' : ''}
          ${isDisabled ? 'disabled' : ''}>
        <div class="library-item-info">
          <div class="library-item-name">${sanitizeText(lib.formal_name || lib.systemname)}</div>
          <div class="library-item-meta">${sanitizeText(lib.pref || '')} ${sanitizeText(lib.city || '')} / ${sanitizeText(lib.systemid)}</div>
        </div>
      `;

      const checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (selectedLibraries.length >= MAX_LIBRARIES) {
            checkbox.checked = false;
            return;
          }
          selectedLibraries.push({
            systemid: lib.systemid,
            name: lib.formal_name || lib.systemname,
            pref: lib.pref || '',
            city: lib.city || '',
          });
        } else {
          selectedLibraries = selectedLibraries.filter(s => s.systemid !== lib.systemid);
        }
        renderSelectedLibraries();
        // 上限に達したら他のチェックボックスをdisableに
        updateSearchResultCheckboxes();
      });

      searchResultsList.appendChild(item);
    });

    searchResults.classList.remove('hidden');
  }

  function updateSearchResultCheckboxes() {
    const checkboxes = searchResultsList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (!cb.checked) {
        cb.disabled = selectedLibraries.length >= MAX_LIBRARIES;
      }
    });
  }

  // --- 選択中図書館の表示 ---
  function renderSelectedLibraries() {
    selectedCountEl.textContent = selectedLibraries.length;

    if (selectedLibraries.length === 0) {
      selectedLibrariesEl.innerHTML = '<p class="empty-message">図書館が設定されていません</p>';
      return;
    }

    selectedLibrariesEl.innerHTML = '';
    selectedLibraries.forEach((lib, index) => {
      const item = document.createElement('div');
      item.className = 'library-item';
      item.innerHTML = `
        <div class="library-item-info">
          <div class="library-item-name">${sanitizeText(lib.name)}</div>
          <div class="library-item-meta">${sanitizeText(lib.pref)} ${sanitizeText(lib.city)} / ${sanitizeText(lib.systemid)}</div>
        </div>
        <button class="btn btn-danger remove-btn" data-index="${index}">削除</button>
      `;

      item.querySelector('.remove-btn').addEventListener('click', () => {
        selectedLibraries.splice(index, 1);
        renderSelectedLibraries();
        updateSearchResultCheckboxes();
        // 検索結果のチェックボックスを更新
        const cb = document.getElementById(`lib-${lib.systemid}`);
        if (cb) cb.checked = false;
      });

      selectedLibrariesEl.appendChild(item);
    });
  }

  // --- 図書館保存 ---
  saveLibrariesBtn.addEventListener('click', () => {
    chrome.storage.sync.set({ libraries: selectedLibraries }, () => {
      if (chrome.runtime.lastError) {
        showStatus(saveStatus, '保存に失敗しました', 'error');
      } else {
        showStatus(saveStatus, '保存しました', 'success');
      }
    });
  });

  // --- 初期化 ---
  async function init() {
    try {
      const settings = await getSettings();
      apiKeyInput.value = settings.calil_api_key;
      selectedLibraries = settings.libraries || [];
      renderSelectedLibraries();
    } catch (err) {
      console.error('設定の読み込みに失敗しました:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
