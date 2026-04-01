/**
 * Tests for cache functions in content_script.js:
 * getCacheKey, saveToCache, loadFromCache
 */

const { loadContentScript } = require('./helpers/load-content-script');

let fns;

beforeAll(() => {
  fns = loadContentScript();
});

beforeEach(() => {
  sessionStorage.clear();
});

describe('getCacheKey', () => {
  test('generates correct key for a single library', () => {
    const isbn = '9784873117386';
    const libraries = [{ systemid: 'Tokyo_Pref' }];
    expect(fns.getCacheKey(isbn, libraries)).toBe('calil_9784873117386_Tokyo_Pref');
  });

  test('sorts multiple libraries alphabetically', () => {
    const isbn = '9784873117386';
    const libraries = [{ systemid: 'Tokyo_Pref' }, { systemid: 'Osaka_Pref' }];
    expect(fns.getCacheKey(isbn, libraries)).toBe('calil_9784873117386_Osaka_Pref,Tokyo_Pref');
  });

  test('produces the same key regardless of input order', () => {
    const isbn = '9784873117386';
    const order1 = [{ systemid: 'Tokyo_Pref' }, { systemid: 'Osaka_Pref' }];
    const order2 = [{ systemid: 'Osaka_Pref' }, { systemid: 'Tokyo_Pref' }];
    expect(fns.getCacheKey(isbn, order1)).toBe(fns.getCacheKey(isbn, order2));
  });

  test('handles three libraries sorted correctly', () => {
    const isbn = '9784873117386';
    const libraries = [
      { systemid: 'Tokyo_Pref' },
      { systemid: 'Chiba_Pref' },
      { systemid: 'Osaka_Pref' },
    ];
    expect(fns.getCacheKey(isbn, libraries)).toBe(
      'calil_9784873117386_Chiba_Pref,Osaka_Pref,Tokyo_Pref'
    );
  });

  test('handles empty libraries array', () => {
    const isbn = '9784873117386';
    expect(fns.getCacheKey(isbn, [])).toBe('calil_9784873117386_');
  });
});

describe('saveToCache / loadFromCache', () => {
  test('save then load returns original data', () => {
    const key = 'calil_test_key';
    const data = [{ library: { name: '東京都立図書館', systemid: 'Tokyo_Pref' }, result: { status: 'OK', libkey: { '中央': '貸出可' } }, error: null }];
    fns.saveToCache(key, data);
    expect(fns.loadFromCache(key)).toEqual(data);
  });

  test('load from non-existent key returns null', () => {
    expect(fns.loadFromCache('calil_nonexistent_key')).toBeNull();
  });

  test('load from corrupted JSON returns null (error is swallowed)', () => {
    sessionStorage.setItem('calil_broken', 'not valid json {{{{');
    expect(fns.loadFromCache('calil_broken')).toBeNull();
  });

  test('save null data, load returns null', () => {
    const key = 'calil_null_test';
    fns.saveToCache(key, null);
    // JSON.stringify(null) => "null", JSON.parse("null") => null
    expect(fns.loadFromCache(key)).toBeNull();
  });

  test('saved data survives across multiple loads', () => {
    const key = 'calil_multi_load';
    const data = { foo: 'bar', count: 42 };
    fns.saveToCache(key, data);
    expect(fns.loadFromCache(key)).toEqual(data);
    expect(fns.loadFromCache(key)).toEqual(data);
  });

  test('overwrite existing cache entry', () => {
    const key = 'calil_overwrite';
    fns.saveToCache(key, { version: 1 });
    fns.saveToCache(key, { version: 2 });
    expect(fns.loadFromCache(key)).toEqual({ version: 2 });
  });

  test('different keys are stored independently', () => {
    fns.saveToCache('calil_key_a', { id: 'a' });
    fns.saveToCache('calil_key_b', { id: 'b' });
    expect(fns.loadFromCache('calil_key_a')).toEqual({ id: 'a' });
    expect(fns.loadFromCache('calil_key_b')).toEqual({ id: 'b' });
  });
});
