import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

const state_pb = require('./state_pb.js');

const loadGameState = (id) => {
  return new Promise(function(resolve, reject) {
    resolve(null);
  }) 
}

const saveGameState = (id, gameState) => {
  return new Promise(function(resolve, reject) {
    resolve();
  }).catch((reason) => alert('DB write failed ' + reason))
}

function Square(props) {
  return (
    <button className="square" onClick={props.onClick}>
      {props.value}
    </button>
  );
}

class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gameState: null,
    };

    let promise = loadGameState('123456');
    promise
        .then((gameState) => this.initializeStateFromDb(gameState))
        .catch((reason) => this.initializeFreshState(reason));
  }

  initializeStateFromDb(gameState) {
    if (gameState) {
      this.initializeState(gameState);
    } else {
      gameState = this.initializeFreshState(null);
    }
  }

  initializeFreshState(reason) {
    if (reason) alert('Failed to load from DB: ' + reason);

    let size = parseInt(this.props.size);

    let boardState = new state_pb.BoardState();
    for (let i = 0; i < size; i++) {
      // Recreate row for each iteration, to create a separate copy.
      let row = new state_pb.BoardState.Row();
      for (let j = 0; j < size; j++) {
        row.addCol(0);
      }
      boardState.addRow(row);
    }
    let gameState = new state_pb.GameState();
    gameState.setId('123456');
    gameState.setSize(size);
    gameState.setResult(state_pb.GameState.Result.ONGOING);
    gameState.addBoardState(boardState);
    gameState.setBlackIsNext(true);

    this.initializeState(gameState);
  }

  initializeState(gameState) {
    this.setState({
      gameState: gameState,
    });
    saveGameState(gameState.getId(), gameState);
  }

  handleClick(row, col) {
    var gameState = this.state.gameState;
    if (gameState == null) return;
    var boardHistory = gameState.getBoardStateList();
    var board = boardHistory[boardHistory.length - 1].cloneMessage();
    if (board.getRowList()[row].getColList()[col]) return;

    board.getRowList()[row].getColList()[col] = gameState.getBlackIsNext() ? 1 : 2;
    gameState.setBlackIsNext(!gameState.getBlackIsNext());
    gameState.addBoardState(board);
    this.setState({
      gameState: gameState,
    });
    saveGameState(gameState.getId(), gameState);
  }

  renderSquare(row, col) {
    var gameState = this.state.gameState;
    var boardHistory = gameState.getBoardStateList();
    var board = boardHistory[boardHistory.length - 1];
    let char = ["", "B", "W"][board.getRowList()[row].getColList()[col]];
    return <Square value={char} onClick={() => this.handleClick(row, col)} />;
  }

  renderRow(row) {
    let arr = []
    for (let i = 0; i < this.props.size; i++) {
      arr.push(this.renderSquare(row, i));
    }
    return React.createElement("div", {className:"board-row"}, ...arr);
  }

  renderAllRows() {
    let arr = []
    for (let i = 0; i < this.props.size; i++) {
      arr.push(this.renderRow(i));
    }
    return React.createElement("div", null, ...arr);
  }

  render() {
    let status;
    if (this.state.gameState == null) return null;
    status = 'Next player: ' + (this.state.gameState.getBlackIsNext() ? 'B' : 'W');

    return (
      <div>
        <div className="status">{status}</div>
        {this.renderAllRows()}
      </div>
    );
  }
}

class Game extends React.Component {
  render() {
    return (
      <div className="game">
        <div className="game-board">
          <Board size="7" />
        </div>
        <div className="game-info">
          <div>{/* status */}</div>
          <ol>{/* TODO */}</ol>
        </div>
      </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
);
