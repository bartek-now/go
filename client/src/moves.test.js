import * as moves from './moves';

function cleanBoardStr(str) {
  return str.trim().split(/\s+/).join("\n");
}

function makeState(boardStr, blackIsNext) {
  let strRows = boardStr.trim().split(/\s+/);
  let size = strRows.length;
  let board = [];
  let cnt = 0;
  for (let i = 0; i < size; ++i) {
    let row = [];
    for (let j = 0; j < size; ++j) {
      let char = strRows[i].charAt(j);
      if (char == 'B') {
        row[j] = 1;
        ++cnt;
      } else if (char == 'W') {
        row[j] = 2;
        ++cnt;
      }
    }
    if (row.length) {
      board[i] = row;
    }
  }

  let state = moves.constructInitialState(size);
  state.board = board;
  state.stoneCnt = cnt;
  state.blackIsNext = blackIsNext;
  return state;
}

function getBoardStrFromState(state) {
  let board = state.board;
  let size = state.size;
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

test('valid move', () => {
  let initial = `
  ...
  .B.
  ...
  `;
  let states = [makeState(initial, false)];

  moves.makeMove(states, 0, 0);
  let state = states[states.length - 1]
  expect(state.blackIsNext).toBe(true);
  expect(state.capturedWhite).toBe(0);
  expect(state.capturedBlack).toBe(0);
  expect(state.stoneCnt).toBe(2);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  W..
  .B.
  ...
  `));

  moves.makeMove(states, 2, 2);
  state = states[states.length - 1]
  expect(state.blackIsNext).toBe(false);
  expect(state.capturedWhite).toBe(0);
  expect(state.capturedBlack).toBe(0);
  expect(state.stoneCnt).toBe(3);
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
  let state = states[states.length - 1]

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
  let state = states[states.length - 1]
  expect(state.capturedWhite).toBe(0);
  expect(state.stoneCnt).toBe(15);

  state.blackIsNext = true;
  moves.makeMove(states, 3, 3);
  state = states[states.length - 1]
  expect(state.capturedWhite).toBe(5);
  expect(state.capturedBlack).toBe(0);
  expect(state.stoneCnt).toBe(11);
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
  let state = states[states.length - 1]
  expect(state.capturedBlack).toBe(0);
  expect(state.stoneCnt).toBe(13);

  state.blackIsNext = false;
  moves.makeMove(states, 2, 2);
  state = states[states.length - 1]
  expect(state.capturedBlack).toBe(4);
  expect(state.capturedWhite).toBe(0);
  expect(state.stoneCnt).toBe(10);
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
  let state = states[states.length - 1]
  expect(state.capturedWhite).toBe(8);
  expect(state.capturedBlack).toBe(0);
  expect(state.stoneCnt).toBe(17);
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
  let state = states[states.length - 1]
  expect(state.capturedWhite).toBe(0);
  expect(state.stoneCnt).toBe(2);

  state.blackIsNext = true;
  moves.makeMove(states, 0, 1);
  state = states[states.length - 1]
  expect(state.capturedWhite).toBe(1);
  expect(state.capturedBlack).toBe(0);
  expect(state.stoneCnt).toBe(2);
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
  let state = states[states.length - 1]
  expect(state.capturedBlack).toBe(4);
  expect(state.capturedWhite).toBe(0);
  expect(state.stoneCnt).toBe(8);
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
  let state = states[states.length - 1]
  expect(state.capturedWhite).toBe(0);
  expect(state.stoneCnt).toBe(11);

  state.blackIsNext = true;
  moves.makeMove(states, 3, 1);
  state = states[states.length - 1]
  expect(state.capturedWhite).toBe(4);
  expect(state.capturedBlack).toBe(0);
  expect(state.stoneCnt).toBe(8);
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
  let state = states[states.length - 1]
  expect(state.capturedBlack).toBe(5);
  expect(state.capturedWhite).toBe(0);
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
  expect(state.capturedWhite).toBe(0);

  state.blackIsNext = true;
  expect(() => moves.makeMove(states, 2, 2)).toThrowError("field has no liberties");
});

test('no liberties in the corner', () => {
  let initial = `
  .B
  B.
  `;
  let states = [makeState(initial, false)];

  expect(() => moves.makeMove(states, 0, 0)).toThrowError("field has no liberties");

  expect(() => moves.makeMove(states, 1, 1)).toThrowError("field has no liberties");
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
  expect(state.capturedWhite).toBe(1);

  expect(() => moves.makeMove(states, 1, 1)).toThrowError("violated Ko rule");
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
  expect(state.capturedBlack).toBe(1);

  moves.makeMove(states, 2, 3);
  state = states[states.length - 1];
  expect(state.capturedWhite).toBe(2);
  expect(state.capturedBlack).toBe(1);
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
  expect(state.capturedWhite).toBe(2);

  moves.makeMove(states, 2, 2);
  state = states[states.length - 1];
  expect(state.capturedBlack).toBe(1);
  expect(state.capturedWhite).toBe(2);
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
  expect(() => moves.makeMove(states, 4, 2)).toThrowError("violated SuperKo rule");
});
