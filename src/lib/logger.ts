/**
 * Jedyne dozwolone miejsce na logowanie (CLAUDE.md §6 — brak `console.log` w kodzie).
 * W produkcji `debug` milknie; `warn`/`error` zostają, bo są potrzebne w raportach.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

function emit(level: Level, scope: string, message: string, meta?: unknown) {
  if (!isDev && (level === 'debug' || level === 'info')) return;
  const prefix = `[${scope}]`;
  const args: unknown[] = meta === undefined ? [prefix, message] : [prefix, message, meta];
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.warn;
  sink(...args);
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: unknown) => emit('debug', scope, message, meta),
    info: (message: string, meta?: unknown) => emit('info', scope, message, meta),
    warn: (message: string, meta?: unknown) => emit('warn', scope, message, meta),
    error: (message: string, meta?: unknown) => emit('error', scope, message, meta),
  };
}

export const logger = createLogger('app');
