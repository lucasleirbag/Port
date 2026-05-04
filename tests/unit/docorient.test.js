'use strict';

const { utils } = require('../../demos/docorient.js');

describe('clampAngle()', () => {
  test.each([
    [0, 0], [30, 30], [-30, -30], [45, 45], [-45, -45]
  ])('keeps %i° within range → %i°', (input, expected) => {
    expect(utils.clampAngle(input)).toBe(expected);
  });

  test('clamps 90° to 0°', () => expect(utils.clampAngle(90)).toBe(0));
  test('clamps 60° to -30°', () => expect(utils.clampAngle(60)).toBe(-30));
  test('clamps -60° to 30°', () => expect(utils.clampAngle(-60)).toBe(30));
  test('clamps 135° to 45°', () => expect(utils.clampAngle(135)).toBe(45));
  test('clamps -135° to -45°', () => expect(utils.clampAngle(-135)).toBe(-45));
});

describe('normalizeAngle()', () => {
  test.each([
    [0, 0], [90, 90], [180, 180], [270, 270], [360, 0],
    [-90, 270], [-180, 180], [-270, 90], [-360, 0], [450, 90]
  ])('normalizes %i° → %i°', (input, expected) => {
    expect(utils.normalizeAngle(input)).toBeCloseTo(expected);
  });
});

describe('estimateRotationAngle()', () => {
  function makeHorizontalLines(width, height, gap) {
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < height; y += gap || 15) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
      }
    }
    return { data, width, height };
  }

  test('returns a finite number', () => {
    const img = makeHorizontalLines(40, 40);
    const angle = utils.estimateRotationAngle(img, { step: 5, range: 20 });
    expect(typeof angle).toBe('number');
    expect(isFinite(angle)).toBe(true);
  });

  test('returns value within the specified range', () => {
    const img = makeHorizontalLines(50, 50);
    const angle = utils.estimateRotationAngle(img, { step: 5, range: 30 });
    expect(angle).toBeGreaterThanOrEqual(-30);
    expect(angle).toBeLessThanOrEqual(30);
  });

  test('estimates ~0° for a straight horizontal-line image', () => {
    const img = makeHorizontalLines(60, 60, 10);
    const angle = utils.estimateRotationAngle(img, { step: 1, range: 10 });
    expect(Math.abs(angle)).toBeLessThanOrEqual(3);
  });
});
