/**
 * Tests for widget-related functions in content_script.js:
 * getStatusClass, setWidgetResults, ToggleStateManager, ToggleButton, ToggleBehavior
 */

const { loadContentScript } = require('./helpers/load-content-script');

let fns;

beforeAll(() => {
  fns = loadContentScript();
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

// Helper to create a widget DOM matching the expected structure
function createTestWidget() {
  const div = document.createElement('div');
  div.id = 'calil-library-checker';
  div.innerHTML = '<div class="calil-body"></div>';
  document.body.appendChild(div);
  return div;
}

describe('getStatusClass', () => {
  test('"貸出可" returns "available"', () => {
    expect(fns.getStatusClass('貸出可')).toBe('available');
  });

  test('"貸出中" returns "on-loan"', () => {
    expect(fns.getStatusClass('貸出中')).toBe('on-loan');
  });

  test('"休館中" returns "none"', () => {
    expect(fns.getStatusClass('休館中')).toBe('none');
  });

  test('"館内のみ" returns "other"', () => {
    expect(fns.getStatusClass('館内のみ')).toBe('other');
  });

  test('"予約中" returns "other"', () => {
    expect(fns.getStatusClass('予約中')).toBe('other');
  });

  test('"準備中" returns "other"', () => {
    expect(fns.getStatusClass('準備中')).toBe('other');
  });

  test('"蔵書なし" returns "none"', () => {
    expect(fns.getStatusClass('蔵書なし')).toBe('none');
  });

  test('unknown string returns "other"', () => {
    expect(fns.getStatusClass('unknown_status')).toBe('other');
  });

  test('empty string returns "other"', () => {
    expect(fns.getStatusClass('')).toBe('other');
  });
});

describe('setWidgetResults', () => {
  test('normal result with multiple branches shows one system block and correct branch rows', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '東京都立図書館', systemid: 'Tokyo_Pref' },
        result: {
          status: 'OK',
          libkey: { '中央': '貸出可', '多摩': '貸出中' },
          reserveurl: '',
        },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const systemBlocks = widget.querySelectorAll('.calil-system-block');
    expect(systemBlocks).toHaveLength(1);

    const branchRows = widget.querySelectorAll('.calil-branch-row');
    expect(branchRows).toHaveLength(2);
  });

  test('empty libkey {} shows "この図書館には蔵書がありません" and status-icon with class none', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '大阪府立図書館', systemid: 'Osaka_Pref' },
        result: {
          status: 'OK',
          libkey: {},
          reserveurl: '',
        },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const body = widget.querySelector('.calil-body');
    expect(body.textContent).toContain('この図書館には蔵書がありません');
    const statusIcon = widget.querySelector('.calil-status-icon');
    expect(statusIcon.classList.contains('none')).toBe(true);
  });

  test('result.status === "Error" shows "この図書館には蔵書がありません"', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '千葉県立図書館', systemid: 'Chiba_Pref' },
        result: {
          status: 'Error',
          libkey: null,
          reserveurl: '',
        },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const body = widget.querySelector('.calil-body');
    expect(body.textContent).toContain('この図書館には蔵書がありません');
    const statusIcon = widget.querySelector('.calil-status-icon');
    expect(statusIcon.classList.contains('none')).toBe(true);
  });

  test('error set shows "確認に失敗しました" and status-icon with class error', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '埼玉県立図書館', systemid: 'Saitama_Pref' },
        result: null,
        error: 'network error',
      },
    ];

    fns.setWidgetResults(widget, results);

    const body = widget.querySelector('.calil-body');
    expect(body.textContent).toContain('確認に失敗しました');
    const statusIcon = widget.querySelector('.calil-status-icon');
    expect(statusIcon.classList.contains('error')).toBe(true);
  });

  test('empty results array shows "蔵書情報を取得できませんでした"', () => {
    const widget = createTestWidget();

    fns.setWidgetResults(widget, []);

    const body = widget.querySelector('.calil-body');
    expect(body.textContent).toContain('蔵書情報を取得できませんでした');
  });

  test('null results shows "蔵書情報を取得できませんでした"', () => {
    const widget = createTestWidget();

    fns.setWidgetResults(widget, null);

    const body = widget.querySelector('.calil-body');
    expect(body.textContent).toContain('蔵書情報を取得できませんでした');
  });

  test('branch with "貸出可" status has available class on status-icon and branch-status', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '東京都立図書館', systemid: 'Tokyo_Pref' },
        result: {
          status: 'OK',
          libkey: { '中央': '貸出可' },
          reserveurl: '',
        },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const statusIcon = widget.querySelector('.calil-status-icon');
    expect(statusIcon.classList.contains('available')).toBe(true);

    const branchStatus = widget.querySelector('.calil-branch-status');
    expect(branchStatus.classList.contains('available')).toBe(true);
  });

  test('branch with "貸出中" status has on-loan class on status-icon and branch-status', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '東京都立図書館', systemid: 'Tokyo_Pref' },
        result: {
          status: 'OK',
          libkey: { '多摩': '貸出中' },
          reserveurl: '',
        },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const statusIcon = widget.querySelector('.calil-status-icon');
    expect(statusIcon.classList.contains('on-loan')).toBe(true);

    const branchStatus = widget.querySelector('.calil-branch-status');
    expect(branchStatus.classList.contains('on-loan')).toBe(true);
  });

  test('reserve URL present generates .calil-reserve-link with correct href', () => {
    const reserveUrl = 'https://calil.jp/reserve/9784873117386';
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '東京都立図書館', systemid: 'Tokyo_Pref' },
        result: {
          status: 'OK',
          libkey: { '中央': '貸出可' },
          reserveurl: reserveUrl,
        },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const reserveLink = widget.querySelector('.calil-reserve-link');
    expect(reserveLink).not.toBeNull();
    expect(reserveLink.getAttribute('href')).toBe(reserveUrl);
  });

  test('empty reserve URL generates no .calil-reserve-link', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '東京都立図書館', systemid: 'Tokyo_Pref' },
        result: {
          status: 'OK',
          libkey: { '中央': '貸出可' },
          reserveurl: '',
        },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const reserveLink = widget.querySelector('.calil-reserve-link');
    expect(reserveLink).toBeNull();
  });

  test('null reserve URL generates no .calil-reserve-link', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '東京都立図書館', systemid: 'Tokyo_Pref' },
        result: {
          status: 'OK',
          libkey: { '中央': '貸出可' },
          reserveurl: null,
        },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const reserveLink = widget.querySelector('.calil-reserve-link');
    expect(reserveLink).toBeNull();
  });

  test('XSS: library name with script tag is rendered as text, not executed', () => {
    const widget = createTestWidget();
    const xssName = '<script>alert(1)</script>';
    const results = [
      {
        library: { name: xssName, systemid: 'XSS_Lib' },
        result: {
          status: 'OK',
          libkey: { '中央': '貸出可' },
          reserveurl: '',
        },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    // The script tag should not be in the DOM as an active script element
    const scripts = widget.querySelectorAll('script');
    expect(scripts).toHaveLength(0);

    // The text content should be visible (escaped) in the system name
    const systemName = widget.querySelector('.calil-system-name');
    expect(systemName).not.toBeNull();
    // innerHTML should contain the escaped version
    expect(systemName.innerHTML).toContain('&lt;script&gt;');
  });

  test('multiple libraries renders one system block per library', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '東京都立図書館', systemid: 'Tokyo_Pref' },
        result: { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' },
        error: null,
      },
      {
        library: { name: '大阪府立図書館', systemid: 'Osaka_Pref' },
        result: { status: 'OK', libkey: { '中央図書館': '貸出中' }, reserveurl: '' },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const systemBlocks = widget.querySelectorAll('.calil-system-block');
    expect(systemBlocks).toHaveLength(2);
  });

  // --- システム名称表示テスト（要件 4.1, 4.3）---

  test('systemname が存在する場合はシステムヘッダーに systemname を表示する', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '東京都立図書館', systemname: '東京都立', systemid: 'Tokyo_Pref' },
        result: { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const systemName = widget.querySelector('.calil-system-name');
    expect(systemName.textContent).toBe('東京都立');
  });

  test('systemname が存在しない旧データの場合は name にフォールバックする', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '東京都立図書館', systemid: 'Tokyo_Pref' },
        result: { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const systemName = widget.querySelector('.calil-system-name');
    expect(systemName.textContent).toBe('東京都立図書館');
  });

  test('systemname が空文字の場合は name にフォールバックする', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '大阪府立図書館', systemname: '', systemid: 'Osaka_Pref' },
        result: { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' },
        error: null,
      },
    ];

    fns.setWidgetResults(widget, results);

    const systemName = widget.querySelector('.calil-system-name');
    expect(systemName.textContent).toBe('大阪府立図書館');
  });

  test('error の場合も systemname をシステムヘッダーに表示する', () => {
    const widget = createTestWidget();
    const results = [
      {
        library: { name: '東京都立図書館', systemname: '東京都立', systemid: 'Tokyo_Pref' },
        result: null,
        error: 'network error',
      },
    ];

    fns.setWidgetResults(widget, results);

    const systemName = widget.querySelector('.calil-system-name');
    expect(systemName.textContent).toBe('東京都立');
  });
});

// --- ToggleStateManager テスト（タスク 4.1）---

describe('ToggleStateManager', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('loadToggleState: localStorage に "1" がある場合は true を返す', () => {
    localStorage.setItem('calil_widget_collapsed', '1');
    expect(fns.loadToggleState()).toBe(true);
  });

  test('loadToggleState: localStorage にキーがない場合は false を返す', () => {
    expect(fns.loadToggleState()).toBe(false);
  });

  test('loadToggleState: localStorage がエラーを投げても false を返し、例外を伝播しない', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      get() { throw new Error('blocked'); },
      configurable: true,
    });
    let result;
    expect(() => { result = fns.loadToggleState(); }).not.toThrow();
    expect(result).toBe(false);
    Object.defineProperty(window, 'localStorage', original);
  });

  test('saveToggleState(true): localStorage に "calil_widget_collapsed" = "1" が保存される', () => {
    fns.saveToggleState(true);
    expect(localStorage.getItem('calil_widget_collapsed')).toBe('1');
  });

  test('saveToggleState(false): localStorage から "calil_widget_collapsed" キーが削除される', () => {
    localStorage.setItem('calil_widget_collapsed', '1');
    fns.saveToggleState(false);
    expect(localStorage.getItem('calil_widget_collapsed')).toBeNull();
  });

  test('saveToggleState: localStorage がエラーを投げても例外を伝播しない', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      get() { throw new Error('blocked'); },
      configurable: true,
    });
    expect(() => { fns.saveToggleState(true); }).not.toThrow();
    Object.defineProperty(window, 'localStorage', original);
  });
});

// --- ToggleButton / ToggleBehavior テスト（タスク 4.2）---

describe('ToggleButton', () => {
  test('createWidget() が .calil-header 内に .calil-toggle-btn ボタンを含む', () => {
    const widget = fns.createWidget('amazon', '9784873117386');
    document.body.appendChild(widget);
    const btn = widget.querySelector('.calil-header .calil-toggle-btn');
    expect(btn).not.toBeNull();
    expect(btn.tagName).toBe('BUTTON');
  });

  test('createWidget() のトグルボタンの初期状態は aria-expanded="true"', () => {
    const widget = fns.createWidget('amazon', '9784873117386');
    document.body.appendChild(widget);
    const btn = widget.querySelector('.calil-toggle-btn');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  test('createWidget() のトグルボタンは type="button" を持つ', () => {
    const widget = fns.createWidget('amazon', '9784873117386');
    document.body.appendChild(widget);
    const btn = widget.querySelector('.calil-toggle-btn');
    expect(btn.getAttribute('type')).toBe('button');
  });
});

describe('ToggleBehavior', () => {
  function createAndAppendWidget() {
    const widget = fns.createWidget('amazon', '9784873117386');
    document.body.appendChild(widget);
    return widget;
  }

  test('展開状態でボタンをクリックすると .calil-body が非表示になる', () => {
    const widget = createAndAppendWidget();
    fns.initToggleBehavior(widget);
    const btn = widget.querySelector('.calil-toggle-btn');
    btn.click();
    const body = widget.querySelector('.calil-body');
    expect(body.style.display).toBe('none');
  });

  test('展開状態でクリックすると aria-expanded が "false" になる', () => {
    const widget = createAndAppendWidget();
    fns.initToggleBehavior(widget);
    const btn = widget.querySelector('.calil-toggle-btn');
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  test('2回クリックすると .calil-body が表示状態に戻る', () => {
    const widget = createAndAppendWidget();
    fns.initToggleBehavior(widget);
    const btn = widget.querySelector('.calil-toggle-btn');
    btn.click();
    btn.click();
    const body = widget.querySelector('.calil-body');
    expect(body.style.display).toBe('');
  });

  test('2回クリックすると aria-expanded が "true" に戻る', () => {
    const widget = createAndAppendWidget();
    fns.initToggleBehavior(widget);
    const btn = widget.querySelector('.calil-toggle-btn');
    btn.click();
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  test('展開状態でクリックすると .calil-footer も非表示になる', () => {
    const widget = createAndAppendWidget();
    fns.initToggleBehavior(widget);
    const btn = widget.querySelector('.calil-toggle-btn');
    btn.click();
    const footer = widget.querySelector('.calil-footer');
    expect(footer.style.display).toBe('none');
  });

  test('localStorage に折りたたみ状態が保存されている場合、initToggleBehavior で body が非表示になる', () => {
    localStorage.setItem('calil_widget_collapsed', '1');
    const widget = createAndAppendWidget();
    fns.initToggleBehavior(widget);
    const body = widget.querySelector('.calil-body');
    expect(body.style.display).toBe('none');
  });

  test('localStorage に折りたたみ状態が保存されている場合、aria-expanded が "false" になる', () => {
    localStorage.setItem('calil_widget_collapsed', '1');
    const widget = createAndAppendWidget();
    fns.initToggleBehavior(widget);
    const btn = widget.querySelector('.calil-toggle-btn');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  test('展開状態でクリックすると localStorage に "1" が保存される', () => {
    const widget = createAndAppendWidget();
    fns.initToggleBehavior(widget);
    const btn = widget.querySelector('.calil-toggle-btn');
    btn.click();
    expect(localStorage.getItem('calil_widget_collapsed')).toBe('1');
  });

  test('折りたたみ状態でクリックすると localStorage のキーが削除される', () => {
    localStorage.setItem('calil_widget_collapsed', '1');
    const widget = createAndAppendWidget();
    fns.initToggleBehavior(widget);
    const btn = widget.querySelector('.calil-toggle-btn');
    btn.click();
    expect(localStorage.getItem('calil_widget_collapsed')).toBeNull();
  });
});
