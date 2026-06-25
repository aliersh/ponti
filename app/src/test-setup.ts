// Vitest setup: expose a functional localStorage global in happy-dom environments.
// Node v24+ defines localStorage with a getter that returns undefined without
// --localstorage-file. vitest's happy-dom wiring skips injecting window.localStorage
// (already in global). This installs an in-memory Storage shim at the global level.

// Only needed in happy-dom environment (window exists but localStorage returns undefined).
if (typeof window !== 'undefined') {
  const current = (globalThis as any).localStorage
  if (current == null) {
    // Provide an in-memory Storage implementation for tests that use localStorage.
    const store = new Map<string, string>()
    const shim: Storage = {
      get length() { return store.size },
      key(i) { return [...store.keys()][i] ?? null },
      getItem(k) { return store.get(k) ?? null },
      setItem(k, v) { store.set(k, String(v)) },
      removeItem(k) { store.delete(k) },
      clear() { store.clear() },
    }
    Object.defineProperty(globalThis, 'localStorage', {
      get: () => shim,
      configurable: true,
    })
  }
}
