/**
 * Lightweight deferred pub/sub for sequencing background tasks after boot.
 *
 * Key property: if an event has already fired when `on()` is called, the
 * handler runs on the next microtask — no race between component mount order
 * and AppShell's emit. This makes it safe to subscribe from child components
 * whose useEffect runs after the parent's.
 */

type Handler = () => void;

const _handlers = new Map<string, Set<Handler>>();
const _fired = new Set<string>();

export const bootBus = {
  emit(event: string): void {
    _fired.add(event);
    (_handlers.get(event) ?? new Set()).forEach((fn) => fn());
  },

  on(event: string, fn: Handler): () => void {
    if (_fired.has(event)) {
      Promise.resolve().then(fn);
    }
    if (!_handlers.has(event)) _handlers.set(event, new Set());
    _handlers.get(event)!.add(fn);
    return () => _handlers.get(event)?.delete(fn);
  },
};
