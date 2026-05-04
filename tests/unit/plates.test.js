'use strict';

const { utils } = require('../../demos/plates.js');

describe('extractPlateText()', () => {
  test('extracts old-format plate', () => {
    expect(utils.extractPlateText('ABC1234')).toBe('ABC1234');
  });

  test('handles hyphens and spaces in old format', () => {
    expect(utils.extractPlateText('ABC-1234')).toBe('ABC1234');
    expect(utils.extractPlateText('ABC 1234')).toBe('ABC1234');
  });

  test('extracts Mercosul plate', () => {
    expect(utils.extractPlateText('ABC1D23')).toBe('ABC1D23');
    expect(utils.extractPlateText('XYZ2E45')).toBe('XYZ2E45');
  });

  test('prefers Mercosul over old format when both match', () => {
    expect(utils.extractPlateText('ABC1D23')).toBe('ABC1D23');
  });

  test('handles OCR noise around the plate', () => {
    expect(utils.extractPlateText('  |ABC1234|  ')).toBe('ABC1234');
    expect(utils.extractPlateText('placa: ABC1D23 ok')).toBe('ABC1D23');
  });

  test('returns null for unrecognised text', () => {
    expect(utils.extractPlateText('hello')).toBeNull();
    expect(utils.extractPlateText('123456')).toBeNull();
    expect(utils.extractPlateText('')).toBeNull();
  });

  test('returns null for null / undefined', () => {
    expect(utils.extractPlateText(null)).toBeNull();
    expect(utils.extractPlateText(undefined)).toBeNull();
  });
});

describe('formatPlate()', () => {
  test('inserts hyphen at position 3 for 7-char plates', () => {
    expect(utils.formatPlate('ABC1234')).toBe('ABC-1234');
    expect(utils.formatPlate('ABC1D23')).toBe('ABC-1D23');
  });

  test('returns empty string for falsy input', () => {
    expect(utils.formatPlate(null)).toBe('');
    expect(utils.formatPlate('')).toBe('');
    expect(utils.formatPlate(undefined)).toBe('');
  });

  test('returns short strings unchanged (edge case)', () => {
    expect(utils.formatPlate('ABC')).toBe('ABC');
  });
});

describe('isValidPlate()', () => {
  test('validates old-format plates', () => {
    expect(utils.isValidPlate('ABC1234')).toBe(true);
    expect(utils.isValidPlate('ABC-1234')).toBe(true);
  });

  test('validates Mercosul plates', () => {
    expect(utils.isValidPlate('ABC1D23')).toBe(true);
    expect(utils.isValidPlate('XYZ 2E45')).toBe(true);
  });

  test('rejects plates with wrong length', () => {
    expect(utils.isValidPlate('AB1234')).toBe(false);
    expect(utils.isValidPlate('ABCD1234')).toBe(false);
  });

  test('rejects plates with wrong pattern', () => {
    expect(utils.isValidPlate('123ABCD')).toBe(false);
    expect(utils.isValidPlate('ABCDEFG')).toBe(false);
  });

  test('returns false for null / empty', () => {
    expect(utils.isValidPlate(null)).toBe(false);
    expect(utils.isValidPlate('')).toBe(false);
  });
});
