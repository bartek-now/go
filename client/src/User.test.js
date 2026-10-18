import React from 'react';
import {MemoryRouter} from 'react-router-dom';
import {act} from 'react-dom/test-utils';
import {cleanup, render} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import User from './User';
import {loadUser} from './api';

jest.mock('./api');
const profile = name => ({id: name, name, games: [], otherUsers: []});
const screen = (login, ref) => <MemoryRouter><User ref={ref} match={{params: {userLogin: login}}} /></MemoryRouter>;
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(() => { cleanup(); jest.clearAllTimers(); jest.useRealTimers(); });

test('leaving a profile stops its polling and aborts its request', async () => {
  loadUser.mockResolvedValue(profile('Alice'));
  let view;
  await act(async () => { view = render(screen('alice')); });
  const signal = loadUser.mock.calls[0][1].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  jest.advanceTimersByTime(10000);
  expect(loadUser).toHaveBeenCalledTimes(1);
});

test('switching users ignores the previous profile response', async () => {
  let resolveOld;
  loadUser.mockImplementation(login => login === 'alice'
      ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve(profile('Bob')));
  const ref = React.createRef();
  const view = render(screen('alice', ref));
  const oldSignal = loadUser.mock.calls[0][1].signal;
  await act(async () => { view.rerender(screen('bob', ref)); });
  expect(oldSignal.aborted).toBe(true);
  expect(view.getByText('Hello Bob!')).toBeInTheDocument();
  await act(async () => { resolveOld(profile('Alice')); });
  expect(view.getByText('Hello Bob!')).toBeInTheDocument();
});

test('a temporary profile load error retries and recovers', async () => {
  loadUser.mockRejectedValueOnce(Error('offline')).mockResolvedValue(profile('Alice'));
  let view;
  await act(async () => { view = render(screen('alice')); });
  expect(view.getByRole('alert')).toHaveTextContent('offline');
  await act(async () => { jest.advanceTimersByTime(1500); });
  expect(view.getByText('Hello Alice!')).toBeInTheDocument();
});
