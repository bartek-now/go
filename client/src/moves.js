
export function constructInitialState(size) {
    return {
        size: size,
        board: [],
        lastMove: null,
        blackStonesOnBoard: 0,
        whiteStonesOnBoard: 0,
        blackStonesCaptured: 0,
        whiteStonesCaptured: 0,
        blackTerritorySize: 0,
        whiteTerritorySize: 0,
        status: 0,  // 0 - ongoing, 1 - black won, 2 - white won
        blackIsNext: true,
        passCnt : 0,
        territory: [],
        timestamp: Date.now(),
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

    // Check if this field was already visited and mark as visited if wasn't.
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

// Traverses the board starting with an occupied field and marks empty fields in |visitState|
// that are connected to the starting field. You have to call this function with |first=true|.
function traverseEmpty(size, board, visitState, row, col, first=true) {
    // The first call always starts with an occupied field on the board. Skip the checked and setting
    // |visitState| until we get off the occupied field.
    if (!first) {
      // First check if we got outside of the board, or the field is occupied.
      if (row < 0 || row >= size || col < 0 || col >= size) return;
      let field = getField(board, row, col);
      if (field) return;
  
      // Check if this field was already visited and mark as visited if wasn't.
      // Note, |visitState| can be set to true only for empty fields. 
      if (wasVisited(visitState, row, col)) return 0;
      setVisited(visitState, row, col);
    }
  
    traverseEmpty(size, board, visitState, row, col + 1, false);
    traverseEmpty(size, board, visitState, row, col - 1, false);
    traverseEmpty(size, board, visitState, row + 1, col, false);
    traverseEmpty(size, board, visitState, row - 1, col, false);
}

// Export for testing.
export function markEmptyTerritory(size, board) {
    let blackTerritory = [];
    let whiteTerritory = [];
    for (let i = 0; i < size; ++i) {
        for (let j = 0; j < size; ++j) {
            let field = getField(board, i, j);
            if (field === 1) {
                traverseEmpty(size, board, blackTerritory, i, j, true);
            } else if (field === 2) {
                traverseEmpty(size, board, whiteTerritory, i, j, true);
            }
        }
    }
    let territory = [];
    let blackCnt = 0;
    let whiteCnt = 0;
    for (let i = 0; i < size; ++i) {
        for (let j = 0; j < size; ++j) {
            if (wasVisited(blackTerritory, i, j) && !wasVisited(whiteTerritory, i, j)) {
                setField(territory, i, j, 1);
                blackCnt++;
            } else if (!wasVisited(blackTerritory, i, j) && wasVisited(whiteTerritory, i, j)) {
                setField(territory, i, j, 2);
                whiteCnt++;
            }
        }
    }
    return {territory: territory, blackCnt: blackCnt, whiteCnt: whiteCnt};
}

function boardsAreEqual(size, board1, board2) {
    for (let i = 0; i < size; ++i) {
        for (let j = 0; j < size; ++j) {
            if (getField(board1, i, j) !== getField(board2, i, j)) {
                return false;
            }
        }
    }
    return true;
}

// Returns an object that either has a new |board| (and independent copy of the input board, with
// the move applied), or |error|.
export function makeMove(gameStates, row, col) {
    let state = gameStates[gameStates.length - 1];
    if (state.status) {
        throw Error("game has ended");
    }

    let board = state.board;
    let size = state.size;
    if (getField(board, row, col)) throw Error("field is already occupied");

    // Use a JSON trick to make a deep copy of the board, before modifying it.
    let newState = JSON.parse(JSON.stringify(state));
    newState.blackIsNext = !state.blackIsNext;
    newState.passCnt = 0;
    newState.lastMove = {row: row, col: col};

    let moveColor = state.blackIsNext ? 1 : 2;
    let capturingColor = state.blackIsNext ? 2 : 1;
    setField(newState.board, row, col, moveColor);
    if (moveColor === 1) {
        newState.blackStonesOnBoard++;
    } else {
        newState.whiteStonesOnBoard++;
    }

    // Try capturing.
    let captured = 0;
    captured += tryCapture(size, newState.board, row, col - 1, capturingColor);
    captured += tryCapture(size, newState.board, row, col + 1, capturingColor);
    captured += tryCapture(size, newState.board, row - 1, col, capturingColor);
    captured += tryCapture(size, newState.board, row + 1, col, capturingColor);
    if (capturingColor === 1) {
        newState.blackStonesOnBoard -= captured;
        newState.blackStonesCaptured += captured;
    } else {
        newState.whiteStonesOnBoard -= captured;
        newState.whiteStonesCaptured += captured;
    }

    // If the newly placed stone has no liberties, it's an illegal move. Check this after capturing
    // because this may have created liberties.
    let visitState = [];
    if (!hasLiberties(size, newState.board, visitState, row, col, moveColor))
        throw Error("field has no liberties");

    // Now check for the Ko rule, by making sure that the board state isn't repeated, while the same
    // player has a turn (hence check every two states).
    for (let i = gameStates.length - 2; i >= 0; i -= 2) {
        let oldState = gameStates[i];
        // Checked the stone count first as an optimization, then comapare the entire board.
        if (newState.whiteStonesOnBoard === oldState.whiteStonesOnBoard
            && newState.blackStonesOnBoard === oldState.blackStonesOnBoard
            && boardsAreEqual(size, newState.board, oldState.board)) {
            if (i === gameStates.length - 2) throw Error("violated Ko rule");
            throw Error("violated SuperKo rule");
        }
    }

    let ret = markEmptyTerritory(size, newState.board);
    newState.territory = ret.territory;
    newState.blackTerritorySize = ret.blackCnt;
    newState.whiteTerritorySize = ret.whiteCnt;

    // Now that we verified the move is valid, commit it to the state history.
    newState.timestamp = Date.now();
    gameStates.push(newState);
}

export function pass(gameStates) {
    let state = gameStates[gameStates.length - 1];
    if (state.status) {
        throw Error("game has ended");
    }

    // Use a JSON trick to make a deep copy of the board, before modifying it.
    let newState = JSON.parse(JSON.stringify(state));
    newState.passCnt++;
    newState.blackIsNext = !state.blackIsNext;
    newState.lastMove = null;

    if (state.blackIsNext) {
        newState.blackStonesCaptured++;
    } else {
        newState.whiteStonesCaptured++;
    }

    // Decide if the game has ended.
    if (newState.passCnt >= 2 && newState.blackIsNext) {
        let blackScore = newState.blackStonesOnBoard + newState.blackTerritorySize;
        let whiteScore = newState.whiteStonesOnBoard + newState.whiteTerritorySize + 7.5;  // 7.5 for Komi
        newState.status = blackScore > whiteScore ? 1 : 2;
        newState.blackScoreExplanation = `${newState.blackStonesOnBoard} stones + ${newState.blackTerritorySize} for teritory => score ${blackScore}`;
        newState.whiteScoreExplanation = `${newState.whiteStonesOnBoard} stones + ${newState.whiteTerritorySize} for teritory + 7.5 Komi => score ${whiteScore}`;
    }

    newState.timestamp = Date.now();
    gameStates.push(newState);
}

export function undo(gameStates) {
    if (gameStates.length <= 1) {
        throw Error("at the beginning of the game");
    }
    gameStates.pop();
    // Update |timestamp|, so that the state can be accepted by other clients. They use |timestamp|
    // to determine if the loaded state is newer than the state the client has.
    // It also restarts the clock (this may not be desirable if we want to account time more
    // thoroughly).
    gameStates[gameStates.length - 1].timestamp = Date.now();
}