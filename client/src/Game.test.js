import React from 'react';
import {act} from 'react-dom/test-utils';
import {cleanup, fireEvent, render} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Game from './Game';
import {loadGame, saveGame} from './api';
import * as moves from './moves';

jest.mock('./api');
jest.mock('react-konva', () => {
  const shape = () => null;
  return {Circle: shape, Layer: shape, Line: shape, Rect: shape, Stage: shape, Text: shape};
});

function initialGame() {
  return {gameId: 'game', revision: 0, selfIsBlack: true, selfName: 'Black', opponentName: 'White', gameStates: [moves.constructInitialState(9)]};
}

async function mountGame(gameInfo = initialGame()) {
  loadGame.mockResolvedValue(gameInfo);
  const ref = React.createRef();
  let view;
  await act(async () => {
    view = render(<Game ref={ref} match={{params: {playerId: 'player'}}} />);
  });
  return {...view, game: ref.current, gameInfo};
}

beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(() => { cleanup(); jest.clearAllTimers(); jest.useRealTimers(); });

test('the board stays unchanged and actions are disabled until the server confirms a save', async () => {
  const {game, gameInfo, getByText, queryByRole} = await mountGame();
  let resolveSave;
  saveGame.mockReturnValue(new Promise(resolve => { resolveSave = resolve; }));
  fireEvent.click(getByText('Pass'));
  expect(game.state.gameStates).toEqual(gameInfo.gameStates);
  expect(getByText('Pass')).toBeDisabled();
  expect(getByText('Undo')).toBeDisabled();
  expect(queryByRole('status')).toHaveTextContent('Saving');
  const history = JSON.parse(JSON.stringify(gameInfo.gameStates));
  moves.pass(history);
  await act(async () => { resolveSave({gameStates: history, revision: 1}); });
  expect(game.state.revision).toBe(1);
  expect(game.state.gameStates).toEqual(history);
  expect(queryByRole('status')).toBeNull();
});

test('rapid actions cannot submit overlapping saves', async () => {
  const {game} = await mountGame();
  let resolveSave;
  saveGame.mockReturnValue(new Promise(resolve => { resolveSave = resolve; }));
  let pending;
  act(() => {
    pending = game.handleFieldClick(0, 0);
    game.handlePassPress();
    game.handleUndoPress();
  });
  expect(saveGame).toHaveBeenCalledTimes(1);
  expect(saveGame.mock.calls[0][1]).toEqual({type: 'move', row: 0, col: 0});
  await act(async () => { resolveSave({gameStates: game.state.gameStates, revision: 1}); await pending; });
});

test('a rejected save displays the error and reloads the authoritative board', async () => {
  const {game, gameInfo, getByText, getByRole} = await mountGame();
  const recovered = {...initialGame(), revision: 3};
  recovered.gameStates[0].timestamp = gameInfo.gameStates[0].timestamp - 10000;
  loadGame.mockResolvedValue(recovered);
  saveGame.mockRejectedValue(Error('The game changed; reload before trying again'));
  await act(async () => { fireEvent.click(getByText('Pass')); });
  expect(getByRole('alert')).toHaveTextContent('Could not confirm the save');
  expect(game.state.gameStates).toEqual(recovered.gameStates);
  expect(game.state.revision).toBe(3);
  expect(getByText('Pass')).not.toBeDisabled();
});

test('if save and reload both fail, playing stays blocked until a successful retry', async () => {
  const {game, gameInfo, getByText, getByRole} = await mountGame();
  saveGame.mockRejectedValue(Error('offline'));
  loadGame.mockRejectedValue(Error('offline'));
  await act(async () => { fireEvent.click(getByText('Pass')); });
  expect(game.state.gameStates).toEqual(gameInfo.gameStates);
  expect(getByText('Pass')).toBeDisabled();
  expect(getByRole('alert')).toHaveTextContent('Retry loading before playing');
  await act(async () => { await game.handleFieldClick(1, 1); });
  expect(saveGame).toHaveBeenCalledTimes(1);
  loadGame.mockResolvedValue(gameInfo);
  await act(async () => { fireEvent.click(getByText('Retry loading')); });
  expect(getByText('Pass')).not.toBeDisabled();
});
