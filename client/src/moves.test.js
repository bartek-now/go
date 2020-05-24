import * as moves from './moves';

function cleanBoardStr(str) {
  return str.trim().split(/\s+/).join("\n");
}

function makeState(boardStr, blackIsNext) {
  let strRows = boardStr.trim().split(/\s+/);
  let size = strRows.length;
  let board = [];
  let blackCnt = 0;
  let whiteCnt = 0;
  for (let i = 0; i < size; ++i) {
    let row = [];
    for (let j = 0; j < size; ++j) {
      let char = strRows[i].charAt(j);
      if (char == 'B') {
        row[j] = 1;
        ++blackCnt;
      } else if (char == 'W') {
        row[j] = 2;
        ++whiteCnt;
      }
    }
    if (row.length) {
      board[i] = row;
    }
  }

  let state = moves.constructInitialState(size);
  state.board = board;
  state.blackStonesOnBoard = blackCnt;
  state.whiteStonesOnBoard = whiteCnt;
  state.blackIsNext = blackIsNext;
  return state;
}

function getBoardStr(size, board) {
  let strRows = [];
  for (let i = 0; i < size; ++i) {
    let str = "";
    for (let j = 0; j < size; ++j) {
      str += [".", "B", "W"][moves.getField(board, i, j)];
    }
    strRows.push(str);
  }
  return strRows.join("\n");
}

function getBoardStrFromState(state) {
  return getBoardStr(state.size, state.board);
}

test('valid move', () => {
  let initial = `
  ...
  .B.
  ...
  `;
  let states = [makeState(initial, false)];

  moves.makeMove(states, 0, 0);
  let state = states[states.length - 1];
  expect(state.blackIsNext).toBe(true);
  expect(state.whiteStonesOnBoard).toBe(1);
  expect(state.blackStonesOnBoard).toBe(1);
  expect(state.whiteStonesCaptured).toBe(0);
  expect(state.blackStonesCaptured).toBe(0);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  W..
  .B.
  ...
  `));

  moves.makeMove(states, 2, 2);
  state = states[states.length - 1];
  expect(state.blackIsNext).toBe(false);
  expect(state.whiteStonesOnBoard).toBe(1);
  expect(state.blackStonesOnBoard).toBe(2);
  expect(state.whiteStonesCaptured).toBe(0);
  expect(state.blackStonesCaptured).toBe(0);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  W..
  .B.
  ..B
  `));
});

test('field occupied', () => {
  let initial = `
  B..
  .B.
  ..B
  `;
  let states = [makeState(initial, true)];
  let state = states[states.length - 1];

  expect(() => moves.makeMove(states, 0, 0)).toThrowError('field is already occupied');

  state.blackIsNext = !state.blackIsNext;
  expect(() => moves.makeMove(states, 2, 2)).toThrowError('field is already occupied');
});

test('capture in the center', () => {
  let initial = `
  ..B..
  .BWB.
  BWWWB
  BWB.B
  .B...
  `;
  let states = [makeState(initial, true)];

  moves.makeMove(states, 4, 3);
  let state = states[states.length - 1];
  expect(state.whiteStonesOnBoard).toBe(5);
  expect(state.blackStonesOnBoard).toBe(10);
  expect(state.whiteStonesCaptured).toBe(0);

  state.blackIsNext = true;
  moves.makeMove(states, 3, 3);
  state = states[states.length - 1];
  expect(state.whiteStonesOnBoard).toBe(0);
  expect(state.blackStonesOnBoard).toBe(11);
  expect(state.whiteStonesCaptured).toBe(5);
  expect(state.blackStonesCaptured).toBe(0);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  ..B..
  .B.B.
  B...B
  B.BBB
  .B.B.
  `));
});

test('capture 3 groups in the center', () => {
  let initial = `
  ..W..
  .WBW.
  WB.BW
  WB.W.
  .W...
  `;
  let states = [makeState(initial, false)];

  moves.makeMove(states, 3, 2);
  let state = states[states.length - 1];
  expect(state.whiteStonesOnBoard).toBe(9);
  expect(state.blackStonesOnBoard).toBe(4);
  expect(state.blackStonesCaptured).toBe(0);

  state.blackIsNext = false;
  moves.makeMove(states, 2, 2);
  state = states[states.length - 1];
  expect(state.whiteStonesOnBoard).toBe(10);
  expect(state.blackStonesOnBoard).toBe(0);
  expect(state.blackStonesCaptured).toBe(4);
  expect(state.whiteStonesCaptured).toBe(0);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  ..W..
  .W.W.
  W.W.W
  W.WW.
  .W...
  `));
});

test('capture from within', () => {
  let initial = `
  BBBBB
  BWWWB
  BW.WB
  BWWWB
  BBBBB
  `;
  let states = [makeState(initial, true)];

  moves.makeMove(states, 2, 2);
  let state = states[states.length - 1];
  expect(state.whiteStonesOnBoard).toBe(0);
  expect(state.blackStonesOnBoard).toBe(17);
  expect(state.whiteStonesCaptured).toBe(8);
  expect(state.blackStonesCaptured).toBe(0);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  BBBBB
  B...B
  B.B.B
  B...B
  BBBBB
  `));
});

test('capture in the corner', () => {
  let initial = `
  W.
  ..
  `;
  let states = [makeState(initial, true)];

  moves.makeMove(states, 1, 0);
  let state = states[states.length - 1];
  expect(state.whiteStonesOnBoard).toBe(1);
  expect(state.blackStonesOnBoard).toBe(1);
  expect(state.whiteStonesCaptured).toBe(0);

  state.blackIsNext = true;
  moves.makeMove(states, 0, 1);
  state = states[states.length - 1];
  expect(state.whiteStonesOnBoard).toBe(0);
  expect(state.blackStonesOnBoard).toBe(2);
  expect(state.whiteStonesCaptured).toBe(1);
  expect(state.blackStonesCaptured).toBe(0);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  .B
  B.
  `));
});

test('capture on the edge', () => {
  let initial = `
  .WW.
  WBBB
  WBWW
  .W..
  `;
  let states = [makeState(initial, false)];

  moves.makeMove(states, 0, 3);
  let state = states[states.length - 1];
  expect(state.whiteStonesOnBoard).toBe(8);
  expect(state.blackStonesOnBoard).toBe(0);
  expect(state.blackStonesCaptured).toBe(4);
  expect(state.whiteStonesCaptured).toBe(0);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  .WWW
  W...
  W.WW
  .W..
  `));
});

test('capture on the edge 2', () => {
  let initial = `
  .B..
  BWB.
  BWWB
  ..WB
  `;
  let states = [makeState(initial, true)];

  moves.makeMove(states, 3, 0);
  let state = states[states.length - 1];
  expect(state.whiteStonesOnBoard).toBe(4);
  expect(state.blackStonesOnBoard).toBe(7);
  expect(state.whiteStonesCaptured).toBe(0);

  state.blackIsNext = true;
  moves.makeMove(states, 3, 1);
  state = states[states.length - 1];
  expect(state.whiteStonesOnBoard).toBe(0);
  expect(state.blackStonesOnBoard).toBe(8);
  expect(state.whiteStonesCaptured).toBe(4);
  expect(state.blackStonesCaptured).toBe(0);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  .B..
  B.B.
  B..B
  BB.B
  `));
});

test('capture on the edge 3', () => {
  let initial = `
  .....
  .....
  WWWWW
  WBBBW
  WB.BW
  `;
  let states = [makeState(initial, false)];

  moves.makeMove(states, 4, 2);
  let state = states[states.length - 1];
  expect(state.blackStonesOnBoard).toBe(0);
  expect(state.whiteStonesOnBoard).toBe(10);
  expect(state.blackStonesCaptured).toBe(5);
  expect(state.whiteStonesCaptured).toBe(0);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  .....
  .....
  WWWWW
  W...W
  W.W.W
  `));
});

test('no liberties in the center', () => {
  let initial = `
  ..W..
  .WBW.
  WB.BW
  WB.W.
  .WW..
  `;
  let states = [makeState(initial, true)];

  moves.makeMove(states, 3, 2);
  let state = states[states.length - 1];
  expect(state.whiteStonesCaptured).toBe(0);

  state.blackIsNext = true;
  expect(() => moves.makeMove(states, 2, 2)).toThrowError('field has no liberties');
});

test('no liberties in the corner', () => {
  let initial = `
  .B
  B.
  `;
  let states = [makeState(initial, false)];

  expect(() => moves.makeMove(states, 0, 0)).toThrowError('field has no liberties');

  expect(() => moves.makeMove(states, 1, 1)).toThrowError('field has no liberties');
});

test('Ko', () => {
  let initial = `
  .BW.
  BW.W
  .BW.
  ....
  `;
  let states = [makeState(initial, true)];

  moves.makeMove(states, 1, 2);
  let state = states[states.length - 1];
  expect(state.whiteStonesCaptured).toBe(1);

  expect(() => moves.makeMove(states, 1, 1)).toThrowError('violated Ko rule');
});

test('not Ko 1-2', () => {
  let initial = `
  .....
  .BBW.
  BW.BW
  .BBW.
  .....
  `;
  let states = [makeState(initial, false)];

  moves.makeMove(states, 2, 2);
  let state = states[states.length - 1];
  expect(state.blackStonesCaptured).toBe(1);

  moves.makeMove(states, 2, 3);
  state = states[states.length - 1];
  expect(state.whiteStonesCaptured).toBe(2);
  expect(state.blackStonesCaptured).toBe(1);
});

test('not Ko 2-1', () => {
  let initial = `
  .....
  .BBW.
  BWW.W
  .BBW.
  .....
  `;
  let states = [makeState(initial, true)];

  moves.makeMove(states, 2, 3);
  let state = states[states.length - 1];
  expect(state.whiteStonesCaptured).toBe(2);

  moves.makeMove(states, 2, 2);
  state = states[states.length - 1];
  expect(state.blackStonesCaptured).toBe(1);
  expect(state.whiteStonesCaptured).toBe(2);
});

test('Superko', () => {
  let initial = `
  B.BW.
  BBWW.
  BW.W.
  BBWW.
  B.BW.
  `;
  let states = [makeState(initial, false)];

  moves.makeMove(states, 0, 1);
  moves.makeMove(states, 2, 2);
  moves.makeMove(states, 4, 1);
  moves.makeMove(states, 0, 2);
  moves.makeMove(states, 2, 1);
  expect(() => moves.makeMove(states, 4, 2)).toThrowError('violated SuperKo rule');
});

test('territory', () => {
  let initial = `
  ..BW...
  BWW.WW.
  W...W.W
  W.W...W
  BWBW.W.
  .B.BW.B
  ...BW..
  `;
  let states = [makeState(initial, false)];
  let state = states[0];

  let territory = moves.markEmptyTerritory(state.size, state.board);
  expect(getBoardStr(state.size, territory)).toBe(cleanBoardStr(`
  ....WWW
  ...W..W
  .WWW.W.
  .W.WWW.
  ....W..
  B.B....
  BBB....
  `));
});

test('pass then move', () => {
  let initial = `
  W..
  .B.
  ..B
  `;
  let states = [makeState(initial, false)];

  moves.pass(states);
  let state = states[states.length - 1];
  expect(state.status).toBe(0);
  expect(state.blackIsNext).toBe(true);
  expect(state.passCnt).toBe(1);

  moves.pass(states);
  state = states[states.length - 1];
  expect(state.status).toBe(0);
  expect(state.blackIsNext).toBe(false);
  expect(state.blackStonesOnBoard).toBe(2);
  expect(state.whiteStonesOnBoard).toBe(1);
  expect(state.passCnt).toBe(2);

  moves.makeMove(states, 0, 1);
  state = states[states.length - 1];
  expect(state.status).toBe(0);
  expect(state.passCnt).toBe(0);
});

test('pass 2 - game over', () => {
  let initial = `
  W..
  .B.
  ..B
  `;
  let states = [makeState(initial, true)];

  moves.pass(states);
  let state = states[states.length - 1];
  expect(state.status).toBe(0);
  expect(state.blackIsNext).toBe(false);
  expect(state.passCnt).toBe(1);

  moves.pass(states);
  state = states[states.length - 1];
  expect(state.status).toBe(1);
  expect(state.blackIsNext).toBe(true);
  expect(state.passCnt).toBe(2);

  expect(() => moves.makeMove(states, 0, 1)).toThrowError('game has ended');

  expect(() => moves.pass(states)).toThrowError('game has ended');
});

test('pass 3 - game over', () => {
  let initial = `
  W..
  .B.
  ..B
  `;
  let states = [makeState(initial, false)];

  moves.pass(states);
  let state = states[states.length - 1];
  expect(state.status).toBe(0);
  expect(state.blackIsNext).toBe(true);
  expect(state.passCnt).toBe(1);

  moves.pass(states);
  state = states[states.length - 1];
  expect(state.status).toBe(0);
  expect(state.blackIsNext).toBe(false);
  expect(state.passCnt).toBe(2);

  moves.pass(states);
  state = states[states.length - 1];
  expect(state.status).toBe(1);
  expect(state.blackIsNext).toBe(true);
  expect(state.passCnt).toBe(3);

  expect(() => moves.makeMove(states, 0, 1)).toThrowError('game has ended');

  expect(() => moves.pass(states)).toThrowError('game has ended');
});
