'use strict';

const { utils } = require('../../demos/omr.js');

function makeImageData(width, height, darkCells) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  (darkCells || []).forEach(({ x, y, w, h }) => {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        if (px >= width || py >= height) continue;
        const i = (py * width + px) * 4;
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
      }
    }
  });
  return { data, width, height };
}

const BASE_CFG = { rows: 3, cols: 3, startX: 0, startY: 0, cellW: 10, cellH: 10, threshold: 0.3 };

describe('detectMarkedCells()', () => {
  test('detects a fully filled cell', () => {
    const img = makeImageData(30, 30, [{ x: 0, y: 0, w: 10, h: 10 }]);
    const marks = utils.detectMarkedCells(img, BASE_CFG);
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ row: 0, col: 0 });
    expect(marks[0].fill).toBeGreaterThan(0.9);
  });

  test('returns empty array for an all-white image', () => {
    const img = makeImageData(30, 30, []);
    expect(utils.detectMarkedCells(img, BASE_CFG)).toHaveLength(0);
  });

  test('detects marks in multiple cells', () => {
    const img = makeImageData(30, 30, [
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 20, w: 10, h: 10 }
    ]);
    const marks = utils.detectMarkedCells(img, BASE_CFG);
    expect(marks).toHaveLength(2);
  });

  test('does not detect cell below threshold', () => {
    // 2/10 = 20% dark — below 30% threshold
    const img = makeImageData(30, 30, [{ x: 0, y: 0, w: 2, h: 10 }]);
    expect(utils.detectMarkedCells(img, BASE_CFG)).toHaveLength(0);
  });

  test('detects cell exactly above custom threshold', () => {
    // 5/10 = 50% dark — above 40% threshold
    const img = makeImageData(30, 30, [{ x: 0, y: 0, w: 5, h: 10 }]);
    const marks = utils.detectMarkedCells(img, { ...BASE_CFG, threshold: 0.4 });
    expect(marks).toHaveLength(1);
  });

  test('identifies correct row and col', () => {
    // Fill cell at row=1, col=2 (x=20, y=10)
    const img = makeImageData(30, 30, [{ x: 20, y: 10, w: 10, h: 10 }]);
    const marks = utils.detectMarkedCells(img, BASE_CFG);
    expect(marks[0]).toMatchObject({ row: 1, col: 2 });
  });

  test('returns empty for zero-size imageData', () => {
    const img = { data: new Uint8ClampedArray(0), width: 0, height: 0 };
    expect(utils.detectMarkedCells(img, BASE_CFG)).toHaveLength(0);
  });
});

describe('buildAnswerMap()', () => {
  test('maps each row to the detected column', () => {
    const marks = [{ row: 0, col: 2, fill: 0.9 }, { row: 1, col: 0, fill: 0.8 }];
    const map = utils.buildAnswerMap(marks);
    expect(map[0]).toMatchObject({ col: 2 });
    expect(map[1]).toMatchObject({ col: 0 });
  });

  test('keeps highest-fill mark when a row has multiple marks', () => {
    const marks = [{ row: 0, col: 1, fill: 0.4 }, { row: 0, col: 3, fill: 0.9 }];
    expect(utils.buildAnswerMap(marks)[0]).toMatchObject({ col: 3 });
  });

  test('returns empty object for empty input', () => {
    expect(utils.buildAnswerMap([])).toEqual({});
  });

  test('preserves fill ratio in result', () => {
    const marks = [{ row: 0, col: 0, fill: 0.75 }];
    expect(utils.buildAnswerMap(marks)[0].fill).toBeCloseTo(0.75);
  });
});

describe('OPTION_LABELS', () => {
  test('exports A–E labels', () => {
    expect(utils.OPTION_LABELS).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});
