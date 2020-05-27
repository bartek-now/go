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
    throw Error('Received status ' + response.status + ': ' + body.message);
  return body;
}

const loadGame = async (playerId) => {
  const response = await fetch('/api/loadgame/' + playerId);
  const body = await response.json();
  if (response.status !== 200)
    throw Error('Received status ' + response.status + ': ' + body.message);
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
    throw Error('Received status ' + response.status + ': ' + body.message);
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
  if (response.status !== 200) throw Error('Received status ' + response.status + ': ' + body.message);
  return body;
}

const millisToHHMMSS = (millis) => {
  let secs = Math.floor(millis / 1000);
  let mins = Math.floor(secs / 60);
  let hours = Math.floor(mins / 60);
  secs %= 60;
  mins %= 60;
  secs = (secs < 10 ? '0' : '') + secs.toString();
  mins = (mins < 10 ? '0' : '') + mins.toString();
  return hours.toString() + ':' + mins + ':' + secs;
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
    if (!this.state
        || gameInfo.gameStates[gameInfo.gameStates.length - 1].timestamp
            > this.state.gameStates[this.state.gameStates.length - 1].timestamp) {
      this.setState(gameInfo);
    }
  }

  persistState(gameInfo) {
    this.setState(gameInfo);
    saveGame(gameInfo);
  }

  handleFieldClick(row, col) {
    let gameInfo = this.state;
    try {
      moves.makeMove(gameInfo.gameStates, row, col);
    } catch (err) {
      alert("Can't make the move: " + err.message);
      return;
    }
    this.persistState(gameInfo);
  }

  handlePassPress() {
    let gameInfo = this.state;
    try {
      moves.pass(gameInfo.gameStates);
    } catch (err) {
      alert("Can't pass: " + err.message);
      return;
    }
    this.persistState(gameInfo);
  }

  handleUndoPress() {
    let gameInfo = this.state;
    try {
      moves.undo(gameInfo.gameStates);
    } catch (err) {
      alert("Can't undo the move: " + err.message);
      return;
    }
    this.persistState(gameInfo);
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
    const markLastMoveRatio = 0.3;
    const markSquareRatio = 0.3;
    const stoneRadiusPx = fieldSizePx * stoneSizeRatio / 2;
    const markLastMoveRadiusPx = fieldSizePx * markLastMoveRatio / 2;
    const markSquareSizePx = fieldSizePx * markSquareRatio
    let arr = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        let x = fieldSizePx * col;
        let y = fieldSizePx * row;
        let xm = x + fieldSizePx / 2;
        let ym = y + fieldSizePx / 2;
        let xe = x + fieldSizePx;
        let ye = y + fieldSizePx;
        let handler = (!gameState.status && gameState.blackIsNext === gameInfo.selfIsBlack) ? () => this.handleFieldClick(row, col) : null;
        let key = row.toString() + ':' + col.toString();
        
        arr.push(<Rect key={'f'+key} x={x} y={y} width={fieldSizePx} height={fieldSizePx} fill={'#A06800'} onClick={handler} />);

        let x1 = col > 0 ? x : xm;
        let x2 = col < size - 1 ? xe : xm;
        arr.push(<Line key={'lh'+key} points={[x1, ym, x2, ym]} stroke={'black'} strokeWidth={1} onClick={handler} />);
        let y1 = row > 0 ? y : ym;
        let y2 = row < size - 1 ? ye : ym;
        arr.push(<Line key={'lv'+key} points={[xm, y1, xm, y2]} stroke={'black'} strokeWidth={1} onClick={handler} />);

        let field = moves.getField(gameState.board, row, col);
        let color = [null, 'black', 'white'][field];
        if (color) {
          arr.push(<Circle key={'s'+key} x={xm} y={ym} radius={stoneRadiusPx} fill={color} shadowOffset={{x:4,y:4}} shadowColor={'black'} shadowOpacity={0.2} onClick={handler} />);
        }

        if (gameState.lastMove && gameState.lastMove.row === row && gameState.lastMove.col === col) {
          arr.push(<Circle key={'c'+key} x={xm} y={ym} radius={markLastMoveRadiusPx} fill={'red'} onClick={handler} />);
        }

        if (gameInfo.showTerritory && !field) {
          color = [null, 'black', 'white'][moves.getField(gameState.territory, row, col)];
          let rectProps = {
            key: 'm' + key,
            x: xm - markSquareSizePx/2,
            y: ym - markSquareSizePx/2,
            width: markSquareSizePx,
            height: markSquareSizePx,
            onClick: handler,
          };
          if (color) {
            rectProps.fill = color;
          } else {
            rectProps.fillLinearGradientStartPoint = { x: 0, y: 0 };
            rectProps.fillLinearGradientEndPoint = { x: markSquareSizePx, y: markSquareSizePx };
            rectProps.fillLinearGradientColorStops = [0, 'white', 1, 'black'];
          }

          arr.push(React.createElement('Rect', rectProps, null));
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
    let status = gameState.status
        ? (gameInfo.selfIsBlack === (gameState.status === 1) ? 'You won!' : 'The game has ended and the winner is *not* you, sorry...')
        : (gameInfo.selfIsBlack === gameState.blackIsNext ? 'Your move!' : 'Waiting for the opponent');
    if (!gameState.status) {
      status += ' [' + millisToHHMMSS(Date.now() - gameState.timestamp) + ']';
    }
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
          <button onClick={() => this.handlePassPress()} disabled={gameState.status || gameState.blackIsNext !== gameInfo.selfIsBlack}>Pass</button>
          <button onClick={() => this.handleUndoPress()} disabled={gameInfo.gameStates.length <= 1 || gameState.blackIsNext === gameInfo.selfIsBlack}>Undo</button>
          <button onClick={() => this.handleShowHideTerritory()}>{gameInfo.showTerritory ? 'Hide' : 'Show'} territory</button>
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
