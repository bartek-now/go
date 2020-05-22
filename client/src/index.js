import * as moves from './moves';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  BrowserRouter as Router,
  Link,
  Route,
  Switch,
  Redirect
} from "react-router-dom"; 
import './index.css';

const loadUser = async (userLogin) => {
  const response = await fetch('/api/loaduser/' + userLogin);
  const body = await response.json();
  if (response.status !== 200)
    throw Error('Received status ' + response.status + ": " + body.message);
  return body;
}

const loadGame = async (playerId) => {
  const response = await fetch('/api/loadgame/' + playerId);
  const body = await response.json();
  if (response.status !== 200)
    throw Error('Received status ' + response.status + ": " + body.message);
  return body;
}

const saveGame = async (gameInfo) => {
  const response = await fetch('/api/savegame/' + gameInfo.gameId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameInfo.gameStates),
  });
  const body = await response.json();
  if (response.status !== 200)
    throw Error('Received status ' + response.status + ": " + body.message);
}

const saveFreshGame = async (gameSeed) => {
  const response = await fetch('/api/newgame/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameSeed),
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

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.continuouslyLoadGame();
  }

  continuouslyLoadGame() {
    loadGame(this.props.match.params.playerId)
        .then(gameInfo => {
          this.initializeStateFromDb(gameInfo);
          setTimeout(() => this.continuouslyLoadGame(), 1500);
        })
        .catch(reason => alert('Failed to load the game from DB: ' + reason));
  }

  initializeStateFromDb(gameInfo) {
    if (!this.state ||
      gameInfo.gameStates.length > this.state.gameStates.length)
      this.setState(gameInfo);
  }

  handleClick(row, col) {
    let gameInfo = this.state;
    let gameState = gameInfo.gameStates[gameInfo.gameStates.length - 1];
    if (gameState.blackIsNext !== gameInfo.selfIsBlack) return;

    let result = moves.makeMove(gameState, row, col);
    if (result.error) {
      alert("Can't move there: " + result.error);
      return;
    }
    gameInfo.gameStates.push(result.gameState);
    this.setState(gameInfo);
    saveGame(gameInfo);
  }

  renderSquare(row, col) {
    let gameInfo = this.state;
    let gameState = gameInfo.gameStates[gameInfo.gameStates.length - 1];
    let char = ["", "B", "W"][moves.getField(gameState.board, row, col)];
    return <Square value={char} onClick={() => this.handleClick(row, col)} />;
  }

  renderRow(row) {
    let gameInfo = this.state;
    let gameState = gameInfo.gameStates[gameInfo.gameStates.length - 1];
    let arr = []
    for (let i = 0; i < gameState.size; i++) {
      arr.push(this.renderSquare(row, i));
    }
    return React.createElement("div", {className:"board-row"}, ...arr);
  }

  renderAllRows() {
    let gameInfo = this.state;
    let gameState = gameInfo.gameStates[gameInfo.gameStates.length - 1];
    let arr = []
    for (let i = 0; i < gameState.size; i++) {
      arr.push(this.renderRow(i));
    }
    return React.createElement("div", null, ...arr);
  }

  render() {
    let gameInfo = this.state;
    if (!gameInfo) return null;

    let gameState = gameInfo.gameStates[gameInfo.gameStates.length - 1];
    let player = 'Hello ' + gameInfo.selfName + ', you are playing as ' + (gameInfo.selfIsBlack ? 'Black' : 'White') + ' against ' + gameInfo.opponentName;
    let status = gameInfo.selfIsBlack === gameState.blackIsNext ? 'Your move!' : 'Waiting for the opponent';
    return (
      <div>
        <div className="status">{player}</div>
        <div className="status">{status}</div>
        <div className="status">Black stones caputred: {gameState.capturedBlack}</div>
        <div className="status">White stones captured: {gameState.capturedWhite}</div>
        <div>
          {this.renderAllRows()}
        </div>
      </div>
    );
  }
}

class NewGame extends React.Component {
  constructor(props) {
    super(props);

    // TODO: allow to provide size in UI
    saveFreshGame(this.constructGameSeed(9))
        .then(state => this.setState(state))
        .catch(reason => alert('Failed to initialize a game: ' + reason));
  }

  constructGameSeed(size) {
    let gameSeed = {
      selfUserId: this.props.match.params.userId,
      opponentUserId: this.props.match.params.opponentId,
      gameState: moves.constructInitialState(size),
    };
    return gameSeed;
  }

  render() {
    if (!this.state) return null;

    let redirect = "/p/" + this.state.playerId;
    return (<Redirect to={redirect} />);
  }
}

class User extends React.Component {
  constructor(props) {
    super(props);
    this.continuouslyLoadUser();
  }

  continuouslyLoadUser() {
    loadUser(this.props.match.params.userLogin)
        .then(userInfo => {
          this.setState(userInfo); 
          setTimeout(() => this.continuouslyLoadUser(), 1500);
        })
        .catch(reason => alert('Failed to load the game from DB: ' + reason));
  }

  handleButtonClick() {
    let s = document.getElementById("opponent");
    if (s.selectedIndex === 0) {
      alert("No opponenet selected")
      return;
    }
    let redirect = "/new/u/" + this.state.id + "/o/" + s.options[s.selectedIndex].value;
    this.setState({redirect: redirect});
  }

  render() {
    if (!this.state) return null;

    if (this.state.redirect) {
      return (<Redirect to={this.state.redirect} />);
    }

    let optionTemplate = this.state.otherUsers.map(v => (
      <option value={v.id}>{v.name}</option>
    ));
    let gameTemplate = this.state.games.map(v => {
      let link = "/p/" + v.selfPlayerId;
      let color = v.selfIsBlack ? 'Black' : 'White';
      return (<li><Link to={link}>Playing as {color} against {v.opponentName}</Link></li>);
    });

    return (
      <div>
        <div className="status">
          Hello {this.state.name}!
        </div>
        <div className="status">
          <button onClick={() => this.handleButtonClick()}>
            Start a new game
          </button>
          &nbsp;against&nbsp;
          <select id="opponent">
            <option />
            {optionTemplate}
          </select>
        </div>
        <div>
          Or return to one of existing games:
          <nav>
            <ul>
              {gameTemplate}
            </ul>
          </nav>
        </div>
      </div>
    );
  }
}

// ========================================

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/new/u/:userId/o/:opponentId" component={NewGame} />
        <Route exact path="/p/:playerId" component={Game} />
        <Route exact path="/u/:userLogin" component={User} />
      </Switch>
    </Router>
  );
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
