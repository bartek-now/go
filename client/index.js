import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

const state_pb = require('./state_pb.js');

// This was needed to avoid pg-native issue.
// https://github.com/serverless-heaven/serverless-webpack/issues/78#issuecomment-271336996
const Pool = require('pg').Pool

// TODO: Don't show the password to the entire world!
const pool = new Pool({
  user: 'zkmzsgqmovqbrv',
  host: 'ec2-54-152-175-141.compute-1.amazonaws.com',
  database: 'd131oid7lp7bhj',
  password: 'fce9deec2a53dac7b9bb8661198e3379a33daa2c3a29b9b219d6f43f5e679eda',
  port: 5432,
});

const loadGameState = (id) => {
  return new Promise(function(resolve, reject) {
    // TODO: Don't make SQL injection that easy!
    pool.query('SELECT State FROM Games WHERE id=$1', [id], (error, results) => {
      if (error) {
        reject(error)
      }
      resolve(results.rows[0]);
    })
  }) 
}

const saveGameState = (id, gameState) => {
  return new Promise(function(resolve, reject) {
    pool.query('INSERT INTO Games (name, email) VALUES ($1, $2) RETURNING *', [id, gameState.serializeBinary()], (error, results) => {
      if (error) {
        reject(error)
      }
      resolve(`Game state has been saved: ${results.rows[0]}`)
    })
  }).then(() => alert('DB write succeeded')).catch((reason) => alert('DB write failed ' + reason))
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
    promise.then((gameState) => this.initializeStateFromDb(gameState)).catch((reason) => setTimeout(() => this.initializeFreshState(reason), 3000));
  }

  initializeStateFromDb(gameState) {
    alert('Loading from DB: ' + gameState);
  }

  initializeFreshState(reason) {
    alert('Failed to load from DB: ' + reason);
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
