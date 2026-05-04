'use strict';

const { utils } = require('../../demos/ocr.js');

describe('buildHighlightedHtml()', () => {
  test('returns empty string for empty array', () => {
    expect(utils.buildHighlightedHtml([])).toBe('');
  });

  test('returns empty string for non-array input', () => {
    expect(utils.buildHighlightedHtml(null)).toBe('');
    expect(utils.buildHighlightedHtml(undefined)).toBe('');
  });

  test('applies conf-high class for confidence >= 80', () => {
    const html = utils.buildHighlightedHtml([{ text: 'Hello', confidence: 90 }]);
    expect(html).toContain('conf-high');
    expect(html).toContain('Hello');
  });

  test('applies conf-mid class for confidence in [50, 80)', () => {
    const html = utils.buildHighlightedHtml([{ text: 'maybe', confidence: 65 }]);
    expect(html).toContain('conf-mid');
  });

  test('applies conf-low class for confidence < 50', () => {
    const html = utils.buildHighlightedHtml([{ text: 'noise', confidence: 20 }]);
    expect(html).toContain('conf-low');
  });

  test('escapes HTML special characters in text', () => {
    const html = utils.buildHighlightedHtml([{ text: '<script>alert(1)</script>', confidence: 90 }]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('includes confidence value in title attribute', () => {
    const html = utils.buildHighlightedHtml([{ text: 'word', confidence: 75 }]);
    expect(html).toContain('conf: 75%');
  });

  test('joins multiple words with space', () => {
    const html = utils.buildHighlightedHtml([
      { text: 'Foo', confidence: 90 },
      { text: 'Bar', confidence: 90 }
    ]);
    expect(html).toContain('Foo');
    expect(html).toContain('Bar');
    expect(html.indexOf('Foo')).toBeLessThan(html.indexOf('Bar'));
  });
});

describe('cleanText()', () => {
  test('trims leading and trailing whitespace', () => {
    expect(utils.cleanText('  hello  ')).toBe('hello');
  });

  test('collapses multiple spaces into one', () => {
    expect(utils.cleanText('foo   bar')).toBe('foo bar');
  });

  test('preserves single newlines', () => {
    expect(utils.cleanText('line1\nline2')).toBe('line1\nline2');
  });

  test('collapses 3+ newlines to 2', () => {
    expect(utils.cleanText('a\n\n\n\nb')).toBe('a\n\nb');
  });

  test('returns empty string for null / undefined', () => {
    expect(utils.cleanText(null)).toBe('');
    expect(utils.cleanText(undefined)).toBe('');
  });
});

describe('averageConfidence()', () => {
  test('calculates mean confidence', () => {
    const words = [{ confidence: 80 }, { confidence: 60 }, { confidence: 100 }];
    expect(utils.averageConfidence(words)).toBeCloseTo(80);
  });

  test('returns 0 for empty array', () => {
    expect(utils.averageConfidence([])).toBe(0);
  });

  test('returns 0 for null', () => {
    expect(utils.averageConfidence(null)).toBe(0);
  });

  test('handles missing confidence fields gracefully', () => {
    const words = [{ confidence: 60 }, { text: 'no-conf' }];
    expect(utils.averageConfidence(words)).toBeCloseTo(30);
  });
});
