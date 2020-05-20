
export function getField(board, row, col) {
    // If row is undefined/null, assume all its fields are 0.
    return !board[row] ? 0 : (!board[row][col] ? 0 : board[row][col]);
}
function setField(board, row, col, value) {
    // If row is undefined/null, create it first.
    if (!board[row]) board[row] = [];
    board[row][col] = value;
}

function getState(state, row, col) {
    // If row is undefined, assume all its fields are false.
    return !state[row] ? false : state[row][col] === true;
}
function setState(state, row, col) {
    // If row is undefined/null, create it first.
    if (!state[row]) state[row] = [];
    state[row][col] = true;
}

function hasLiberties(size, board, state, row, col, capturingColor) {
    // First check if we got outside of |capturingColor| section. If we're outside of the board or
    // stepped on a field occupied by the opposite color, there is no liberty there. If the field is
    // empty, it's a liberty.
    if (row < 0 || row >= size || col < 0 || col >= size) return false;
    let field = getField(board, row, col);
    if (!field) {
        return true;
    } else if (field !== capturingColor) {
        return false;
    }

    // Check if this field was already visited and then mark as visited.
    // Note, state can be set to true only for fields of |capturingColor|. 
    if (getState(state, row, col)) return 0;
    setState(state, row, col);

    return hasLiberties(size, board, state, row, col + 1, capturingColor)
        || hasLiberties(size, board, state, row, col - 1, capturingColor)
        || hasLiberties(size, board, state, row + 1, col, capturingColor)
        || hasLiberties(size, board, state, row - 1, col, capturingColor);
}

function capture(size, board, row, col, capturingColor) {
    if (row < 0 || row >= size || col < 0 || col >= size) return 0;

    let field = getField(board, row, col);
    if (field !== capturingColor)  return 0;
    setField(board, row, col, null);

    return 1
        + capture(size, board, row, col + 1, capturingColor)
        + capture(size, board, row, col - 1, capturingColor)
        + capture(size, board, row + 1, col, capturingColor)
        + capture(size, board, row - 1, col, capturingColor);
}

function tryCapture(size, board, row, col, capturingBlack) {
    if (row < 0 || row >= size || col < 0 || col >= size) return 0;

    let capturingColor = capturingBlack ? 1 : 2;
    // |state| is 2D array reflecting |board|. It's set to true if a field of |capturingColor| has
    // been visited.
    let state = [];
    let captured = 0;
    let field = getField(board, row, col);
    let s = getState(state, row, col);
    if (field === capturingColor && !s) {
        let liberties = hasLiberties(size, board, state, row, col, capturingColor);
        if (!liberties) captured += capture(size, board, row, col, capturingColor);
    }
    return captured;
}

// Returns an object that either has a new |board| (and independent copy of the input board, with
// the move applied), or |error|.
export function makeMove(size, board, row, col, blackTurn) {
    if (getField(board, row, col)) return {error: "field is already occupied"};

    // Use a JSON trick to make a deep copy of the board, before modifying it.
    let newBoard = JSON.parse(JSON.stringify(board));
    setField(newBoard, row, col, blackTurn ? 1 : 2);
    let captured = 0;
    captured += tryCapture(size, newBoard, row, col - 1, !blackTurn);
    captured += tryCapture(size, newBoard, row, col + 1, !blackTurn);
    captured += tryCapture(size, newBoard, row - 1, col, !blackTurn);
    captured += tryCapture(size, newBoard, row + 1, col, !blackTurn);
    return {board: newBoard, captured: captured};
}
