import {loadGame, loadUser, saveGame} from './api';

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('a save sends only an action and its loaded revision', async () => {
  const result = {revision: 6, gameStates: []};
  global.fetch = jest.fn().mockResolvedValue({status: 200, json: async () => result});
  const response = await saveGame({gameId: 'game', revision: 5, gameStates: ['large history']}, {type: 'pass'});
  expect(response).toEqual(result);
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({action: {type: 'pass'}, revision: 5});
});

test('JSON server errors reject with a useful message', async () => {
  global.fetch = jest.fn().mockResolvedValue({status: 409, json: async () => ({message: 'The game changed'})});
  await expect(saveGame({gameId: 'game', revision: 0}, {type: 'pass'})).rejects.toThrow('The game changed');
});

test('non-JSON error responses also reject so the UI can recover', async () => {
  global.fetch = jest.fn().mockResolvedValue({status: 502, json: async () => { throw Error('Unexpected token'); }});
  await expect(saveGame({gameId: 'game', revision: 0}, {type: 'pass'})).rejects.toThrow('Received status 502');
});


test.each([loadGame, loadUser])('GET requests pass cancellation signals to fetch', async load => {
  global.fetch = jest.fn().mockResolvedValue({status: 200, json: async () => ({})});
  const controller = new AbortController();
  await load('id', {signal: controller.signal});
  expect(global.fetch.mock.calls[0][1].signal).toBe(controller.signal);
});

test('save requests pass cancellation signals to fetch', async () => {
  global.fetch = jest.fn().mockResolvedValue({status: 200, json: async () => ({})});
  const controller = new AbortController();
  await saveGame({gameId: 'game', revision: 0}, {type: 'pass'}, {signal: controller.signal});
  expect(global.fetch.mock.calls[0][1].signal).toBe(controller.signal);
});
