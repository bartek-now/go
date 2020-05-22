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
  return board;
}

function getStrFromBoard(size, board) {
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
  let newBoard = moves.makeMove(3, getBoardFromStr(initial), 0, 0, false).board;
  expect(getStrFromBoard(3, newBoard)).toBe(cleanBoardStr(`
      W..
      .B.
      ...
      `));

  newBoard = moves.makeMove(3, newBoard, 2, 2, true).board;
  expect(getStrFromBoard(3, newBoard)).toStrictEqual(cleanBoardStr(`
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
  let error = moves.makeMove(3, getBoardFromStr(initial), 0, 0, false).error;
  expect(error).toBe('field is already occupied');

  error = moves.makeMove(3, getBoardFromStr(initial), 2, 2, true).error;
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
  let result = moves.makeMove(5, getBoardFromStr(initial), 4, 3, true);
  expect(result.captured).toBe(0);

  result = moves.makeMove(5, result.board, 3, 3, true);
  expect(result.captured).toBe(5);
  expect(getStrFromBoard(5, result.board)).toStrictEqual(cleanBoardStr(`
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
  let result = moves.makeMove(5, getBoardFromStr(initial), 3, 2, false);
  expect(result.captured).toBe(0);

  result = moves.makeMove(5, result.board, 2, 2, false);
  expect(result.captured).toBe(4);
  expect(getStrFromBoard(5, result.board)).toStrictEqual(cleanBoardStr(`
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
  let result = moves.makeMove(5, getBoardFromStr(initial), 2, 2, true);
  expect(result.captured).toBe(8);
  expect(getStrFromBoard(5, result.board)).toStrictEqual(cleanBoardStr(`
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
  let result = moves.makeMove(2, getBoardFromStr(initial), 1, 0, true);
  expect(result.captured).toBe(0);

  result = moves.makeMove(2, result.board, 0, 1, true);
  expect(result.captured).toBe(1);
  expect(getStrFromBoard(2, result.board)).toStrictEqual(cleanBoardStr(`
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
  let result = moves.makeMove(4, getBoardFromStr(initial), 0, 3, false);
  expect(result.captured).toBe(4);
  expect(getStrFromBoard(4, result.board)).toBe(cleanBoardStr(`
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
  let result = moves.makeMove(4, getBoardFromStr(initial), 3, 0, true);
  expect(result.captured).toBe(0);

  result = moves.makeMove(4, result.board, 3, 1, true);
  expect(getStrFromBoard(4, result.board)).toBe(cleanBoardStr(`
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
  let result = moves.makeMove(5, getBoardFromStr(initial), 4, 2, false);
  expect(result.captured).toBe(5);
  expect(getStrFromBoard(5, result.board)).toBe(cleanBoardStr(`
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
  let result = moves.makeMove(5, getBoardFromStr(initial), 3, 2, true);
  expect(result.captured).toBe(0);

  result = moves.makeMove(5, result.board, 2, 2, true);
  expect(result.error).toBe("field has no liberties");
});

test('no liberties in the corner', () => {
  let initial = `
      .B
      B.
      `;
  let result = moves.makeMove(2, getBoardFromStr(initial), 0, 0, false);
  expect(result.error).toBe("field has no liberties");

  result = moves.makeMove(2, getBoardFromStr(initial), 1, 1, false);
  expect(result.error).toBe("field has no liberties");
});
