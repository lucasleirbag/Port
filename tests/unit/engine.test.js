'use strict';

const DemoEngine = require('../../demos/engine.js');

const mockDemo = (title) => ({
  title: title || 'test',
  mount: jest.fn().mockResolvedValue(undefined),
  unmount: jest.fn().mockResolvedValue(undefined),
});

afterEach(async () => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

// Use closeDelay:0 to skip animation wait in all tests
const eng = () => new DemoEngine({ closeDelay: 0 });

describe('register()', () => {
  test('registers a valid demo', () => {
    expect(() => eng().register('x', mockDemo())).not.toThrow();
  });

  test('throws on empty string id', () => {
    expect(() => eng().register('', mockDemo())).toThrow();
  });

  test('throws on non-string id', () => {
    expect(() => eng().register(null, mockDemo())).toThrow();
  });

  test('throws when demo has no mount()', () => {
    expect(() => eng().register('x', { title: 'no mount' })).toThrow();
  });

  test('returns engine for chaining', () => {
    const e = eng();
    expect(e.register('x', mockDemo())).toBe(e);
  });
});

describe('open()', () => {
  test('rejects if demo not registered', async () => {
    await expect(eng().open('nope')).rejects.toThrow('"nope" not registered');
  });

  test('appends modal to document.body', async () => {
    const e = eng();
    e.register('x', mockDemo());
    await e.open('x');
    expect(document.querySelector('.demo-modal')).not.toBeNull();
    await e.close();
  });

  test('calls demo.mount with the content slot element', async () => {
    const e = eng();
    const d = mockDemo();
    e.register('x', d);
    await e.open('x');
    expect(d.mount).toHaveBeenCalledTimes(1);
    const slot = d.mount.mock.calls[0][0];
    expect(slot.dataset.slot).toBe('content');
    await e.close();
  });

  test('isOpen() returns true after open', async () => {
    const e = eng();
    e.register('x', mockDemo());
    await e.open('x');
    expect(e.isOpen()).toBe(true);
    expect(e.getCurrentId()).toBe('x');
    await e.close();
  });

  test('shows error in modal when mount throws', async () => {
    const e = eng();
    const bad = { title: 'bad', mount: jest.fn().mockRejectedValue(new Error('boom')) };
    e.register('bad', bad);
    await e.open('bad');
    expect(document.querySelector('.demo-error__msg').textContent).toBe('boom');
    await e.close();
  });

  test('closes previous demo before opening a new one', async () => {
    const e = eng();
    const d1 = mockDemo('d1');
    const d2 = mockDemo('d2');
    e.register('a', d1);
    e.register('b', d2);
    await e.open('a');
    await e.open('b');
    expect(d1.unmount).toHaveBeenCalledTimes(1);
    expect(e.getCurrentId()).toBe('b');
    await e.close();
  });
});

describe('close()', () => {
  test('resolves without error when nothing is open', async () => {
    await expect(eng().close()).resolves.toBeUndefined();
  });

  test('calls demo.unmount', async () => {
    const e = eng();
    const d = mockDemo();
    e.register('x', d);
    await e.open('x');
    await e.close();
    expect(d.unmount).toHaveBeenCalledTimes(1);
  });

  test('removes modal from DOM', async () => {
    const e = eng();
    e.register('x', mockDemo());
    await e.open('x');
    await e.close();
    expect(document.querySelector('.demo-modal')).toBeNull();
  });

  test('isOpen() returns false after close', async () => {
    const e = eng();
    e.register('x', mockDemo());
    await e.open('x');
    await e.close();
    expect(e.isOpen()).toBe(false);
    expect(e.getCurrentId()).toBeNull();
  });

  test('restores body overflow after close', async () => {
    const e = eng();
    e.register('x', mockDemo());
    await e.open('x');
    expect(document.body.style.overflow).toBe('hidden');
    await e.close();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('keyboard Escape', () => {
  test('closes open demo on Escape', async () => {
    const e = eng();
    e.register('x', mockDemo());
    await e.open('x');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await new Promise(r => setTimeout(r, 20));
    expect(e.isOpen()).toBe(false);
  });
});

describe('backdrop click', () => {
  test('closes modal when backdrop is clicked', async () => {
    const e = eng();
    e.register('x', mockDemo());
    await e.open('x');
    document.querySelector('.demo-modal__backdrop').click();
    await new Promise(r => setTimeout(r, 20));
    expect(e.isOpen()).toBe(false);
  });
});
