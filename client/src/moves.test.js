import * as moves from './moves';


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


test('valid move', () => {
  let initial = `
      ...
      .B.
      ...
      `;
  let newBoard = moves.makeMove(getBoardFromStr(initial), 0, 0, false).board;
  expect(JSON.stringify(newBoard)).toBe(JSON.stringify(getBoardFromStr(`
      W..
      .B.
      ...
      `)));

  newBoard = moves.makeMove(newBoard, 2, 2, true).board;
  expect(JSON.stringify(newBoard)).toStrictEqual(JSON.stringify(getBoardFromStr(`
      W..
      .B.
      ..B
      `)));
});

test('field occupied', () => {
  let initial = `
      B..
      .B.
      ..B
      `;
  let error = moves.makeMove(getBoardFromStr(initial), 0, 0, false).error;
  expect(error).toBe('field is already occupied');

  error = moves.makeMove(getBoardFromStr(initial), 2, 2, true).error;
  expect(error).toBe('field is already occupied');
});
