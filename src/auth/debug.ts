export const DBG = {
  on: new URLSearchParams(location.search).has("debug") || !!(window as any).__AAD_DEBUG__,
  ts() {
    return new Date().toISOString().substring(11, 23);
  },
  log(...a: any[]) {
    if (this.on) console.log(`[AAD][${this.ts()}]`, ...a);
  },
  warn(...a: any[]) {
    if (this.on) console.warn(`[AAD][${this.ts()}]`, ...a);
  },
  err(...a: any[]) {
    if (this.on) console.error(`[AAD][${this.ts()}]`, ...a);
  },
};
