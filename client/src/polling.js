// Keep at most one request in flight and stop both requests and timers on cleanup.
export function startPolling(load, onValue, onError, interval = 1500) {
  let active = true;
  let timer;
  const controller = new AbortController();
  async function tick() {
    try {
      const value = await load(controller.signal);
      if (active) onValue(value);
    } catch (error) {
      if (active && error.name !== 'AbortError') onError(error);
    } finally {
      if (active) timer = setTimeout(tick, interval);
    }
  }
  tick();
  return () => {
    active = false;
    clearTimeout(timer);
    controller.abort();
  };
}
