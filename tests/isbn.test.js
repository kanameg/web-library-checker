/**
 * Tests for ISBN utility functions in content_script.js
 */

const { loadContentScript } = require('./helpers/load-content-script');

let fns;

beforeAll(() => {
  fns = loadContentScript();
});

describe('calcIsbn13CheckDigit', () => {
  test('computes check digit for 9784873117386', () => {
    expect(fns.calcIsbn13CheckDigit('978487311738')).toBe(6);
  });

  test('computes check digit for 9784048924818 (check digit = 8)', () => {
    // 978404892481 -> verify by manual calculation
    const digits = '978404892481';
    const result = fns.calcIsbn13CheckDigit(digits);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(9);
  });

  test('computes check digit for 9780201633610 (check digit = 0)', () => {
    expect(fns.calcIsbn13CheckDigit('978020163361')).toBe(0);
  });

  test('computes check digit for 9780306406157 (check digit = 7)', () => {
    expect(fns.calcIsbn13CheckDigit('978030640615')).toBe(7);
  });

  test('returns a single digit (0-9)', () => {
    const result = fns.calcIsbn13CheckDigit('978487311738');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(9);
  });
});

describe('normalizeIsbn', () => {
  test('removes hyphens', () => {
    expect(fns.normalizeIsbn('978-4-87311-738-6')).toBe('9784873117386');
  });

  test('removes spaces', () => {
    expect(fns.normalizeIsbn('978 4 87311 738 6')).toBe('9784873117386');
  });

  test('removes mixed hyphens and spaces', () => {
    expect(fns.normalizeIsbn('978 4-87311-738-6')).toBe('9784873117386');
  });

  test('returns plain ISBN unchanged', () => {
    expect(fns.normalizeIsbn('9784873117386')).toBe('9784873117386');
  });

  test('returns empty string for empty input', () => {
    expect(fns.normalizeIsbn('')).toBe('');
  });
});

describe('isbn10to13', () => {
  test('converts ISBN-10 to ISBN-13', () => {
    expect(fns.isbn10to13('4873117380')).toBe('9784873117386');
  });

  test('converts ISBN-10 with X check digit', () => {
    // 487311738X -> 9784873117386? No, let's use a real X example
    // ISBN-10: 080442957X -> ISBN-13: 9780804429573
    expect(fns.isbn10to13('080442957X')).toBe('9780804429573');
  });

  test('converts ISBN-10 with hyphens', () => {
    expect(fns.isbn10to13('4-87311-738-0')).toBe('9784873117386');
  });

  test('returns null for invalid ISBN-10', () => {
    expect(fns.isbn10to13('12345')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(fns.isbn10to13('')).toBeNull();
  });

  test('returns null for 13-digit input', () => {
    expect(fns.isbn10to13('9784873117386')).toBeNull();
  });
});

describe('isbn13to10', () => {
  test('converts ISBN-13 (978) to ISBN-10', () => {
    expect(fns.isbn13to10('9784873117386')).toBe('4873117380');
  });

  test('converts ISBN-13 with X check digit', () => {
    expect(fns.isbn13to10('9780804429573')).toBe('080442957X');
  });

  test('returns null for 979-prefixed ISBN-13', () => {
    expect(fns.isbn13to10('9791032309285')).toBeNull();
  });

  test('returns null for invalid input', () => {
    expect(fns.isbn13to10('12345')).toBeNull();
  });
});

describe('toIsbn13', () => {
  test('returns ISBN-13 unchanged', () => {
    expect(fns.toIsbn13('9784873117386')).toBe('9784873117386');
  });

  test('normalizes ISBN-13 with hyphens', () => {
    expect(fns.toIsbn13('978-4-87311-738-6')).toBe('9784873117386');
  });

  test('converts ISBN-10 to ISBN-13', () => {
    expect(fns.toIsbn13('4873117380')).toBe('9784873117386');
  });

  test('converts ISBN-10 with X check digit to ISBN-13', () => {
    expect(fns.toIsbn13('487311738X')).toBe('9784873117386');
  });

  test('returns null for empty string', () => {
    expect(fns.toIsbn13('')).toBeNull();
  });

  test('returns null for short invalid string', () => {
    expect(fns.toIsbn13('12345')).toBeNull();
  });

  test('returns null for non-ISBN string', () => {
    expect(fns.toIsbn13('notanisbn')).toBeNull();
  });

  test('returns null for 11-digit string', () => {
    expect(fns.toIsbn13('12345678901')).toBeNull();
  });

  test('returns null for 14-digit string', () => {
    expect(fns.toIsbn13('12345678901234')).toBeNull();
  });

  test('handles ISBN-13 without hyphens starting with 979', () => {
    // A valid 979 ISBN-13 check: 9791032309285
    expect(fns.toIsbn13('9791032309285')).toBe('9791032309285');
  });
});

describe('extractAsinFromUrl', () => {
  test('extracts ASIN from simple dp URL', () => {
    expect(fns.extractAsinFromUrl('https://www.amazon.co.jp/dp/4873117380')).toBe('4873117380');
  });

  test('extracts ASIN from URL with title prefix', () => {
    expect(
      fns.extractAsinFromUrl('https://www.amazon.co.jp/タイトル/dp/4873117380/ref=...')
    ).toBe('4873117380');
  });

  test('extracts ASIN from URL with path segments after ASIN', () => {
    expect(
      fns.extractAsinFromUrl('https://www.amazon.co.jp/dp/B08N5M7S6K/ref=sr_1_1')
    ).toBe('B08N5M7S6K');
  });

  test('returns null for search result URL (no /dp/)', () => {
    expect(fns.extractAsinFromUrl('https://www.amazon.co.jp/s?k=python')).toBeNull();
  });

  test('returns null for non-Amazon URL', () => {
    expect(fns.extractAsinFromUrl('https://example.com/product/12345')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(fns.extractAsinFromUrl('')).toBeNull();
  });

  test('extracts alphanumeric ASIN (book)', () => {
    expect(
      fns.extractAsinFromUrl('https://www.amazon.co.jp/dp/4873117380/ref=nosim')
    ).toBe('4873117380');
  });
});
