
export function constructInitialState(size) {
    return {
        size: size,
        board: [],
        status: "ONGOING",
        capturedBlack : 0,
        capturedWhite : 0,
        blackIsNext: true,
    };
}

export function getField(board, row, col) {
    // If row is undefined/null, assume all its fields are 0.
    return !board[row] ? 0 : (!board[row][col] ? 0 : board[row][col]);
}
function setField(board, row, col, value) {
    // If row is undefined/null, create it first.
    if (!board[row]) board[row] = [];
    board[row][col] = value;
}

function wasVisited(visitState, row, col) {
    // If row is undefined, assume all its fields are false.
    return !visitState[row] ? false : visitState[row][col] === true;
}
function setVisited(visitState, row, col) {
    // If row is undefined/null, create it first.
    if (!visitState[row]) visitState[row] = [];
    visitState[row][col] = true;
}

function hasLiberties(size, board, visitState, row, col, capturingColor) {
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

    // Check if this field was already visitState and then mark as visitState.
    // Note, |visitState| can be set to true only for fields of |capturingColor|. 
    if (wasVisited(visitState, row, col)) return 0;
    setVisited(visitState, row, col);

    return hasLiberties(size, board, visitState, row, col + 1, capturingColor)
        || hasLiberties(size, board, visitState, row, col - 1, capturingColor)
        || hasLiberties(size, board, visitState, row + 1, col, capturingColor)
        || hasLiberties(size, board, visitState, row - 1, col, capturingColor);
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

function tryCapture(size, board, row, col, capturingColor) {
    if (row < 0 || row >= size || col < 0 || col >= size) return 0;

    // |visitState| is 2D array reflecting |board|. It's set to true if a field of |capturingColor|
    // has been visited.
    let visitState = [];
    let captured = 0;
    let field = getField(board, row, col);
    let visited = wasVisited(visitState, row, col);
    if (field === capturingColor && !visited) {
        let liberties = hasLiberties(size, board, visitState, row, col, capturingColor);
        if (!liberties) captured += capture(size, board, row, col, capturingColor);
    }
    return captured;
}

// Returns an object that either has a new |board| (and independent copy of the input board, with
// the move applied), or |error|.
export function makeMove(state, row, col) {
    let board = state.board;
    let size = state.size;
    if (getField(board, row, col)) return {error: "field is already occupied"};

    // Use a JSON trick to make a deep copy of the board, before modifying it.
    let newState = JSON.parse(JSON.stringify(state));
    newState.blackIsNext = !state.blackIsNext;

    let moveColor = state.blackIsNext ? 1 : 2;
    let capturingColor = state.blackIsNext ? 2 : 1;
    setField(newState.board, row, col, moveColor);

    // Try capturing.
    let captured = 0;
    captured += tryCapture(size, newState.board, row, col - 1, capturingColor);
    captured += tryCapture(size, newState.board, row, col + 1, capturingColor);
    captured += tryCapture(size, newState.board, row - 1, col, capturingColor);
    captured += tryCapture(size, newState.board, row + 1, col, capturingColor);
    if (capturingColor === 1) {
        newState.capturedBlack += captured;
    } else {
        newState.capturedWhite += captured;
    }

    // If the newly placed stone has no liberties, it's an illegal move. Check this after capturing
    // because this may have created liberties.
    let visitState = [];
    if (!hasLiberties(size, newState.board, visitState, row, col, moveColor))
        return {error: "field has no liberties"};

    return {gameState: newState};
}
