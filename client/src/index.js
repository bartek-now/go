import React from 'react';
import ReactDOM from 'react-dom';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useParams
} from "react-router-dom";
import './index.css';

const loadGameState = async (id) => {
  const response = await fetch('/api/load/' + id);
  const body_text = await response.text()
  console.log(body_text);
  const body = JSON.parse(body_text);
  if (response.status !== 200) throw Error('Received status ' + response.status + ": " + body.message);
  return body.gameState ? body.gameState : null;
}

const saveGameState = async (gameState) => {
  const response = await fetch('/api/save/' + gameState.id, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameState),
  });
  const body = await response.json();
  if (response.status !== 200) throw Error('Received status ' + response.status + ": " + body.message);
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

    loadGameState(props.id)
        .then(gameState => this.initializeStateFromDb(gameState))
        .catch(reason => this.initializeFreshState(reason));
  }

  initializeStateFromDb(gameState) {
    if (gameState) {
      this.setState({
        gameState: gameState,
      });
    } else {
      gameState = this.initializeFreshState(null);
    }
  }

  initializeFreshState(reason) {
    if (reason) alert('Failed to load from DB: ' + reason);

    let size = 15;

    let boardState = [];
    for (let i = 0; i < size; i++) {
      // Recreate row for each iteration, to create a separate copy.
      let row = [];
      for (let j = 0; j < size; j++) {
        row.push(0);
      }
      boardState.push(row);
    }
    let gameState = {
      id: this.props.id,
      size: size,
      status: "ONGOING",
      boardStates: [boardState],
      blackIsNext: true,
    }

    this.setState({
      gameState: gameState,
    });
    saveGameState(gameState);
  }

  handleClick(row, col) {
    var gameState = this.state.gameState;
    if (gameState == null) return;
    var boardHistory = gameState.boardStates;
    var board = boardHistory[boardHistory.length - 1];
    if (board[row][col]) return;
    // Use a JSON trick to make a deep copy of the board, before modifying it.
    board = JSON.parse(JSON.stringify(board));

    board[row][col] = gameState.blackIsNext ? 1 : 2;
    gameState.blackIsNext = !gameState.blackIsNext;
    gameState.boardStates.push(board);
    this.setState({
      gameState: gameState,
    });
    saveGameState(gameState);
  }

  renderSquare(row, col) {
    var boardHistory = this.state.gameState.boardStates;
    var board = boardHistory[boardHistory.length - 1];
    let char = ["", "B", "W"][board[row][col]];
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

    let status;
    status = 'Next player: ' + (this.state.gameState.blackIsNext ? 'B' : 'W');

    return (
      <div>
        <div className="status">{status}</div>
        {this.renderAllRows()}
      </div>
    );
  }
}

function Game() {
  let { id } = useParams();
  return (
      <div className="game">
        <div className="game-board">
          <Board id={id} />
        </div>
      </div>
    );
}

// ========================================

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/:id">
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
