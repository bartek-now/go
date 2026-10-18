import {startPolling} from './polling';

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('cleanup aborts an in-flight request and ignores its late response', async () => {
  let resolveLoad;
  const load = jest.fn().mockReturnValue(new Promise(resolve => { resolveLoad = resolve; }));
  const onValue = jest.fn();
  const onError = jest.fn();
  const stop = startPolling(load, onValue, onError);
  const signal = load.mock.calls[0][0];
  stop();
  expect(signal.aborted).toBe(true);
  resolveLoad('old');
  await flush();
  jest.advanceTimersByTime(10000);
  expect(onValue).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
  expect(load).toHaveBeenCalledTimes(1);
});

test('cleanup cancels the next scheduled poll', async () => {
  const load = jest.fn().mockResolvedValue('value');
  const stop = startPolling(load, jest.fn(), jest.fn());
  await flush();
  stop();
  jest.advanceTimersByTime(10000);
  expect(load).toHaveBeenCalledTimes(1);
});

test('temporary errors are reported and polling resumes', async () => {
  const load = jest.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue('recovered');
  const onValue = jest.fn();
  const onError = jest.fn();
  const stop = startPolling(load, onValue, onError);
  await flush();
  expect(onError).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1500);
  await flush();
  expect(onValue).toHaveBeenCalledWith('recovered');
  stop();
});

test('slow requests cannot overlap with the next poll', async () => {
  const load = jest.fn().mockReturnValue(new Promise(() => {}));
  const stop = startPolling(load, jest.fn(), jest.fn());
  jest.advanceTimersByTime(10000);
  expect(load).toHaveBeenCalledTimes(1);
  stop();
});
