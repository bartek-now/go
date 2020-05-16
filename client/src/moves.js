
export function ret42() {
    return 42;
}

export function makeMove(board, row, col, blackTurn) {
    // Use a JSON trick to make a deep copy of the board, before modifying it.
    let newBoard = JSON.parse(JSON.stringify(board));
    // If row is undefined, assume all its fields are undefined.
    if (!board[row]) newBoard[row] = [];
    newBoard[row][col] = blackTurn ? 1 : 2;
    return newBoard;
  }
