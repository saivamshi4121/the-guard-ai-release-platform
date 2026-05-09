export function createConsoleLogger() {
  return {
    info: (msg: string, meta?: Record<string, unknown>) => {
      if (meta) console.log(`[INFO] ${msg}`, meta);
      else console.log(`[INFO] ${msg}`);
    },
    warn: (msg: string, meta?: Record<string, unknown>) => {
      if (meta) console.warn(`[WARN] ${msg}`, meta);
      else console.warn(`[WARN] ${msg}`);
    },
    error: (msg: string, meta?: Record<string, unknown>) => {
      if (meta) console.error(`[ERROR] ${msg}`, meta);
      else console.error(`[ERROR] ${msg}`);
    },
  };
}

