import * as moves from './moves';

function cleanBoardStr(str) {
  return str.trim().split(/\s+/).join("\n");
}

function getBoardFromStr(str) {
  let strRows = str.trim().split(/\s+/);
  let size = strRows.length;
  let board = [];
  for (let i = 0; i < size; ++i) {
    let row = [];
    for (let j = 0; j < size; ++j) {
      let char = strRows[i].charAt(j);
      if (char == 'B') {
        row[j] = 1;
      } else if (char == 'W') {
        row[j] = 2;
      }
    }
    if (row.length) {
      board[i] = row;
    }
  }
  return {board: board, size: size};
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

function makeState(boardStr, blackIsNext) {
  let ret = getBoardFromStr(boardStr);
  let state = moves.constructInitialState(ret.size);
  state.board = ret.board;
  state.blackIsNext = blackIsNext;
  return state;
}

test('valid move', () => {
  let initial = `
  ...
  .B.
  ...
  `;
  let state = makeState(initial, false);

  state = moves.makeMove(state, 0, 0).gameState;
  expect(state.blackIsNext).toBe(true);
  expect(state.capturedWhite).toBe(0);
  expect(state.capturedBlack).toBe(0);
  expect(getBoardStrFromState(state)).toBe(cleanBoardStr(`
  W..
  .B.
  ...
  `));

  state = moves.makeMove(state, 2, 2).gameState;
  expect(state.blackIsNext).toBe(false);
  expect(state.capturedWhite).toBe(0);
  expect(state.capturedBlack).toBe(0);
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
  let state = makeState(initial, true);

  let error = moves.makeMove(state, 0, 0).error;
  expect(error).toBe('field is already occupied');

  state.blackIsNext = !state.blackIsNext;
  error = moves.makeMove(state, 2, 2).error;
  expect(error).toBe('field is already occupied');
});

test('capture in the center', () => {
  let initial = `
  ..B..
  .BWB.
  BWWWB
  BWB.B
  .B...
  `;
  let state = makeState(initial, true);

  state = moves.makeMove(state, 4, 3).gameState;
  expect(state.capturedWhite).toBe(0);

  state.blackIsNext = true;
  state = moves.makeMove(state, 3, 3).gameState;
  expect(state.capturedWhite).toBe(5);
  expect(state.capturedBlack).toBe(0);
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
  let state = makeState(initial, false);

  state = moves.makeMove(state, 3, 2).gameState;
  expect(state.capturedBlack).toBe(0);

  state.blackIsNext = false;
  state = moves.makeMove(state, 2, 2).gameState;
  expect(state.capturedBlack).toBe(4);
  expect(state.capturedWhite).toBe(0);
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
  let state = makeState(initial, true);

  state = moves.makeMove(state, 2, 2).gameState;
  expect(state.capturedWhite).toBe(8);
  expect(state.capturedBlack).toBe(0);
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
  let state = makeState(initial, true);

  state = moves.makeMove(state, 1, 0).gameState;
  expect(state.capturedWhite).toBe(0);

  state.blackIsNext = true;
  state = moves.makeMove(state, 0, 1).gameState;
  expect(state.capturedWhite).toBe(1);
  expect(state.capturedBlack).toBe(0);
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
  let state = makeState(initial, false);

  state = moves.makeMove(state, 0, 3).gameState;
  expect(state.capturedBlack).toBe(4);
  expect(state.capturedWhite).toBe(0);

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
  let state = makeState(initial, true);

  state = moves.makeMove(state, 3, 0).gameState;
  expect(state.capturedWhite).toBe(0);

  state.blackIsNext = true;
  state = moves.makeMove(state, 3, 1).gameState;
  expect(state.capturedWhite).toBe(4);
  expect(state.capturedBlack).toBe(0);
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
  let state = makeState(initial, false);

  state = moves.makeMove(state, 4, 2).gameState;
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
  let state = makeState(initial, true);

  state = moves.makeMove(state, 3, 2).gameState;
  expect(state.capturedWhite).toBe(0);

  state.blackIsNext = true;
  let error = moves.makeMove(state, 2, 2).error;
  expect(error).toBe("field has no liberties");
});

test('no liberties in the corner', () => {
  let initial = `
  .B
  B.
  `;
  let state = makeState(initial, false);

  let error = moves.makeMove(state, 0, 0).error;
  expect(error).toBe("field has no liberties");

  error = moves.makeMove(state, 1, 1).error;
  expect(error).toBe("field has no liberties");
});
