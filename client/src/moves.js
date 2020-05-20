
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

function countLiberties(size, board, state, row, col, capturingColor) {
    // First check if we got outside of |capturingColor| section. If we're outside of the board or
    // stepped on a field occupied by the opposite color, there is no liberty there. If the field is
    // empty, it's a liberty.
    if (row < 0 || row >= size || col < 0 || col >= size) return 0;
    let field = getField(board, row, col);
    if (!field) {
        return 1;
    } else if (field !== capturingColor) {
        return 0;
    }

    // Check if this field was already visited and then mark as visited.
    // Note, state can be set to true only for fields of |capturingColor|. 
    if (getState(state, row, col)) return 0;
    setState(state, row, col);

    return countLiberties(size, board, state, row, col + 1, capturingColor)
        + countLiberties(size, board, state, row, col - 1, capturingColor)
        + countLiberties(size, board, state, row + 1, col, capturingColor)
        + countLiberties(size, board, state, row - 1, col, capturingColor);
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

function tryCapture(size, board, capturingBlack) {
    let capturingColor = capturingBlack ? 1 : 2;
    // |state| is 2D array reflecting |board|. It's set to true if a field of |capturingColor| has
    // been visited.
    let state = [];
    let captured = 0;
    for (let row = 0; row < size; ++row) {
        for (let col = 0; col < size; ++col) {
            let field = getField(board, row, col);
            let s = getState(state, row, col);
            if (field === capturingColor && !s) {
                let liberties = countLiberties(size, board, state, row, col, capturingColor);
                if (!liberties) captured += capture(size, board, row, col, capturingColor);
            }
        }
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
    let captured = tryCapture(size, newBoard, !blackTurn);
    return {board: newBoard, captured: captured};
}
