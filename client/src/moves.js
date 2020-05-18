
export function getField(board, row, col) {
  // If row is undefined, assume all its fields are undefined.
  return !board[row] ? 0 : (!board[row][col] ? 0 : board[row][col]);
}

// Returns an object that either has a new |board| (and independent copy of the input board, with
// the move applied), or |error|.
export function makeMove(board, row, col, blackTurn) {
    if (getField(board, row, col)) return {error: "field is already occupied"};

    // Use a JSON trick to make a deep copy of the board, before modifying it.
    let newBoard = JSON.parse(JSON.stringify(board));
    // If row is undefined, assume all its fields are undefined.
    if (!board[row]) newBoard[row] = [];
    newBoard[row][col] = blackTurn ? 1 : 2;
    return {board: newBoard};
  }
