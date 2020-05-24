import * as moves from './moves';
import React from 'react';
import ReactDOM from 'react-dom';
import {Circle, Layer, Line, Rect, Stage} from 'react-konva';
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

const millisToHHMMSS = (millis) => {
  let secs = Math.floor(millis / 1000);
  let mins = Math.floor(secs / 60);
  let hours = Math.floor(mins / 60);
  secs %= 60;
  mins %= 60;
  secs = (secs < 10 ? "0" : "") + secs.toString();
  mins = (mins < 10 ? "0" : "") + mins.toString();
  return hours.toString() + ":" + mins + ":" + secs;
}

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.continuouslyLoadGame();
    this.continuouslyRefresh();
  }

  continuouslyLoadGame() {
    loadGame(this.props.match.params.playerId)
        .then(gameInfo => {
          this.initializeStateFromDb(gameInfo);
          setTimeout(() => this.continuouslyLoadGame(), 1500);
        })
        .catch(reason => alert('Failed to load the game from DB: ' + reason));
  }

  continuouslyRefresh() {
    // Reload state to trigger re-draw, to update elapsed time.
    if (this.state) this.setState(this.state);
    setTimeout(() => this.continuouslyRefresh(), 500);
  }

  initializeStateFromDb(gameInfo) {
    if (!this.state || gameInfo.gameStates.length > this.state.gameStates.length) {
      this.setState(gameInfo);
    }
  }

  persistMove(gameInfo) {
    this.setState(gameInfo);
    saveGame(gameInfo);
  }

  handleClick(row, col) {
    let gameInfo = this.state;
    let gameState = gameInfo.gameStates[gameInfo.gameStates.length - 1];
    if (gameState.blackIsNext !== gameInfo.selfIsBlack) return;

    try {
      moves.makeMove(gameInfo.gameStates, row, col);
    } catch (err) {
      alert("Can't make the move: " + err.message);
      return;
    }

    this.persistMove(gameInfo);
  }

  handlePass() {
    let gameInfo = this.state;
    moves.pass(gameInfo.gameStates);

    this.persistMove(gameInfo);
  }

  handleShowHideTerritory() {
    let gameInfo = this.state;
    gameInfo.showTerritory = !gameInfo.showTerritory;
    this.setState(gameInfo);
  }

  renderBoard() {
    let gameInfo = this.state;
    let gameState = gameInfo.gameStates[gameInfo.gameStates.length - 1];
    let size = gameState.size;

    const fieldSizePx = 70;
    const stoneSizeRatio = 0.73;
    const markSquareRatio = 0.3;
    let arr = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        let x = fieldSizePx * col;
        let y = fieldSizePx * row;
        let xm = x + fieldSizePx / 2;
        let ym = y + fieldSizePx / 2;
        let xe = x + fieldSizePx;
        let ye = y + fieldSizePx;
        let handler = () => this.handleClick(row, col);
        let key = row.toString() + ":" + col.toString();
        
        arr.push(<Rect key={"f"+key} x={x} y={y} width={fieldSizePx} height={fieldSizePx} fill={"#A06800"} onClick={handler} />);

        if (row > 0) arr.push(<Line key={"l1"+key} points={[xm, y, xm, ym]} stroke={"black"} strokeWidth={1} onClick={handler} />);
        if (row < size - 1) arr.push(<Line key={"l2"+key} points={[xm, ye, xm, ym]} stroke={"black"} strokeWidth={1} onClick={handler} />);
        if (col > 0) arr.push(<Line key={"l3"+key} points={[x, ym, xm, ym]} stroke={"black"} strokeWidth={1} onClick={handler} />);
        if (col < size - 1) arr.push(<Line key={"l4"+key} points={[xe, ym, xm, ym]} stroke={"black"} strokeWidth={1} onClick={handler} />);

        let field = moves.getField(gameState.board, row, col);
        let color = [null, 'black', 'white'][field];
        if (color) {
          arr.push(<Circle key={"s"+key} x={xm} y={ym} radius={fieldSizePx * stoneSizeRatio / 2} fill={color} stroke={"gray"} strokeWidth={1} onClick={handler} />);
        }


        if (gameInfo.showTerritory && !field) {
          color = [null, 'black', 'white'][moves.getField(gameState.territory, row, col)];
          let markSquareSizePx = fieldSizePx * markSquareRatio;
          let rectProps = {
            key: "m" + key,
            x: xm - markSquareSizePx/2,
            y: ym - markSquareSizePx/2,
            width: markSquareSizePx,
            height: markSquareSizePx,
            stroke: 'gray',
            strokeWidth: 1,
            onClick: handler,
          };
          if (color) {
            rectProps.fill = color;
          } else {
            rectProps.fillLinearGradientStartPoint = { x: 0, y: 0 };
            rectProps.fillLinearGradientEndPoint = { x: markSquareSizePx, y: markSquareSizePx };
            rectProps.fillLinearGradientColorStops = [0, 'white', 1, 'black'];
          }

          arr.push(React.createElement("Rect", rectProps, null));
        }
      }
    }

    let boardSizePx = size * fieldSizePx;
    return (
      <div>
        <Stage width={boardSizePx} height={boardSizePx}>
          <Layer>
            {arr}
          </Layer>
        </Stage>
      </div>
    );
  }

  render() {
    let gameInfo = this.state;
    if (!gameInfo) return null;

    let gameState = gameInfo.gameStates[gameInfo.gameStates.length - 1];
    let player = 'Hello ' + gameInfo.selfName + ', you are playing as ' + (gameInfo.selfIsBlack ? 'Black' : 'White') + ' against ' + gameInfo.opponentName;
    let status = gameInfo.selfIsBlack === gameState.blackIsNext ? 'Your move!' : 'Waiting for the opponent';
    status += " [" + millisToHHMMSS(Date.now() - gameState.timestamp) + "]";
    return (
      <div>
        <div className="status">{player}</div>
        <div className="status emphasize">{status}</div>
        <div className="status">Black stones on board: {gameState.blackStonesOnBoard} (caputred: {gameState.blackStonesCaptured})</div>
        <div className="status">White stones on board: {gameState.whiteStonesOnBoard} (caputred: {gameState.whiteStonesCaptured})</div>
        <div>
          {this.renderBoard()}
        </div>
        <div className="button">
          <button onClick={() => this.handlePass()} disabled={gameState.blackIsNext !== gameInfo.selfIsBlack}>Pass</button>
          <button onClick={() => this.handleShowHideTerritory()}>{gameInfo.showTerritory ? "Hide" : "Show"} territory</button>
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
