import React from 'react';
import ReactDOM from 'react-dom';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useParams
} from "react-router-dom";
import './index.css';


const loadGame = async (playerId) => {
  const response = await fetch('/api/load/' + playerId);
  const body = await response.json()
  if (response.status !== 200) throw Error('Received status ' + response.status + ": " + body.message);
  return body;
}

const saveGame = async (gameInfo) => {
  const response = await fetch('/api/save/' + gameInfo.gameId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameInfo.gameState),
  });
  const body = await response.json();
  if (response.status !== 200) throw Error('Received status ' + response.status + ": " + body.message);
}

const saveFreshGame = async (gameState) => {
  const response = await fetch('/api/new/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameState),
  });
  const body = await response.json();
  if (response.status !== 200) throw Error('Received status ' + response.status + ": " + body.message);
  return body;
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

    loadGame(props.playerId)
        .then(gameInfo => this.initializeStateFromDb(gameInfo))
        .catch(reason => alert('Failed to load the game from DB: ' + reason));
  }

  initializeStateFromDb(gameInfo) {
    this.setState(gameInfo);
  }

  getField(board, row, col) {
    // If row is undefined, assume all its fields are undefined.
    return !board[row] ? 0 : (!board[row][col] ? 0 : board[row][col]);
  }

  setField(board, row, col, val) {
    // If row is undefined, assume all its fields are undefined.
    if (!board[row]) board[row] = [];
    board[row][col] = val;
  }

  handleClick(row, col) {
    let gameInfo = this.state;
    let gameState = gameInfo.gameState;
    if (gameState == null) return;
    let boardHistory = gameState.boardStates;
    let board = boardHistory[boardHistory.length - 1];
    if (this.getField(board, row, col)) return;
    // Use a JSON trick to make a deep copy of the board, before modifying it.
    board = JSON.parse(JSON.stringify(board));

    this.setField(board, row, col, gameState.blackIsNext ? 1 : 2);
    gameState.blackIsNext = !gameState.blackIsNext;
    gameState.boardStates.push(board);
    this.setState(gameInfo);
    saveGame(gameInfo);
  }

  renderSquare(row, col) {
    var boardHistory = this.state.gameState.boardStates;
    var board = boardHistory[boardHistory.length - 1];
    let char = ["", "B", "W"][this.getField(board, row, col)];
    return <Square value={char} onClick={() => this.handleClick(row, col)} />;
  }

  renderRow(row) {
    let arr = []
    for (let i = 0; i < this.state.gameState.size; i++) {
      arr.push(this.renderSquare(row, i));
    }
    return React.createElement("div", {className:"board-row"}, ...arr);
  }

  renderAllRows() {
    let arr = []
    for (let i = 0; i < this.state.gameState.size; i++) {
      arr.push(this.renderRow(i));
    }
    return React.createElement("div", null, ...arr);
  }

  render() {
    if (this.state.gameState == null) return null;

    let status = 'Next player: ' + (this.state.gameState.blackIsNext ? 'B' : 'W');
    return (
      <div>
        <div className="status">{status}</div>
        {this.renderAllRows()}
      </div>
    );
  }
}

function Game() {
  let { playerId } = useParams();
  return (
      <div className="game">
        <div className="game-board">
          <Board playerId={playerId} />
        </div>
      </div>
    );
}

class NewGame extends React.Component {
  constructor(props) {
    super(props);

    saveFreshGame(this.constructFreshState(9))
        .then(ids => this.setState(ids))
        .catch(reason => alert('Failed to initialize a game: ' + reason));
  }

  constructFreshState(size) {
    let boardHistory = [];
    let gameState = {
      size: size,
      status: "ONGOING",
      boardStates: [boardHistory],
      blackIsNext: true,
    }
    return gameState;
  }

  render() {
    if (!this.state) return null;

    let isBlack = Math.random() < 0.5;
    let playerHref = "/" + (isBlack ? this.state.blackPlayerId : this.state.whitePlayerId);
    let opponentHref = "/" + (isBlack ? this.state.whitePlayerId : this.state.blackPlayerId);
    return (
      <div className="game">
        Game ID: {this.state.gameId}
        <br/>
        White ID: {this.state.whitePlayerId}
        <br/>
        Black ID: {this.state.blackPlayerId}
        <br/>
        <a href={playerHref}>Your game link</a>
        <br/>
        <a href={opponentHref}>Opponent's game link</a>
      </div>
    );
  }
}

// ========================================

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/new">
          <NewGame />
        </Route>
        <Route exact path="/:playerId">
          <Game />
        </Route>
      </Switch>
    </Router>
  );
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
