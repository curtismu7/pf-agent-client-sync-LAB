import { beforeEach } from 'vitest';

beforeEach(() => {
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  }
});

// jsdom lacks a localStorage backing store here; the floating-dialog tests need one.
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.clear) {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear(), key: (i) => [...store.keys()][i] ?? null, get length() { return store.size; } };
}

// Minimal matcher: the vendored floating-dialog tests use toHaveClass.
import { expect } from 'vitest';
expect.extend({
  toHaveClass(received, ...classes) {
    const actual = received?.className ?? '';
    const pass = classes.every((c) => actual.split(/\s+/).includes(c));
    return { pass, message: () => `expected ${String(actual)} ${pass ? 'not ' : ''}to include ${classes.join(' ')}` };
  },
});
