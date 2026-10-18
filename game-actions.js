const moves = require('./client/src/moves');

function applyAction(gameStates, action) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw Error('An action is required');
  }
  switch (action.type) {
    case 'move':
      moves.makeMove(gameStates, action.row, action.col);
      break;
    case 'pass':
      moves.pass(gameStates);
      break;
    case 'undo':
      moves.undo(gameStates);
      break;
    default:
      throw Error('Unknown game action');
  }
  return gameStates;
}

module.exports = {applyAction};
