/**
 * Tests for sanitizeText and sanitizeUrl in content_script.js
 */

const { loadContentScript } = require('./helpers/load-content-script');

let fns;

beforeAll(() => {
  fns = loadContentScript();
});

describe('sanitizeText', () => {
  test('normal string passes through unchanged', () => {
    expect(fns.sanitizeText('Hello, World!')).toBe('Hello, World!');
  });

  test('script tag is escaped to HTML entities', () => {
    const result = fns.sanitizeText('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  test('img onerror tag is escaped', () => {
    const result = fns.sanitizeText('<img src=x onerror="alert(1)">');
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
  });

  test('ampersand is escaped to &amp;', () => {
    expect(fns.sanitizeText('A & B')).toBe('A &amp; B');
  });

  test('empty string returns empty string', () => {
    expect(fns.sanitizeText('')).toBe('');
  });

  test('number input is stringified and returned', () => {
    // content_script sanitizeText does not call String() explicitly, but
    // createTextNode coerces the value anyway via textContent
    const result = fns.sanitizeText(42);
    expect(result).toBe('42');
  });

  test('plain text with no special chars is unchanged', () => {
    expect(fns.sanitizeText('東京都立図書館')).toBe('東京都立図書館');
  });

  test('double quotes are not escaped (textContent encodes only <, >, &)', () => {
    // document.createTextNode does not escape quotes
    const result = fns.sanitizeText('"quoted"');
    expect(result).toBe('"quoted"');
  });
});

describe('sanitizeUrl', () => {
  test('https URL is returned as-is', () => {
    expect(fns.sanitizeUrl('https://calil.jp/reserve/123')).toBe('https://calil.jp/reserve/123');
  });

  test('http URL is allowed and returned', () => {
    expect(fns.sanitizeUrl('http://calil.jp/reserve/123')).toBe('http://calil.jp/reserve/123');
  });

  test('javascript: scheme returns #', () => {
    expect(fns.sanitizeUrl('javascript:alert(1)')).toBe('#');
  });

  test('data: scheme returns #', () => {
    expect(fns.sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
  });

  test('ftp: scheme returns #', () => {
    expect(fns.sanitizeUrl('ftp://example.com/file')).toBe('#');
  });

  test('non-URL string returns #', () => {
    expect(fns.sanitizeUrl('not-a-url')).toBe('#');
  });

  test('empty string returns #', () => {
    expect(fns.sanitizeUrl('')).toBe('#');
  });

  test('https URL with query string is preserved', () => {
    const url = 'https://www.library.metro.tokyo.lg.jp/reserve?isbn=9784873117386';
    expect(fns.sanitizeUrl(url)).toBe(url);
  });
});
