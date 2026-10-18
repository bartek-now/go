import * as moves from './moves';
import React from 'react';
import ReactDOM from 'react-dom';
import {Circle, Layer, Line, Rect, Stage, Text} from 'react-konva';
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

const saveGame = async (gameInfo, action) => {
  const response = await fetch('/api/savegame/' + gameInfo.gameId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({action}),
  });
  const body = await response.json();
  if (response.status !== 200)
    throw Error('Received status ' + response.status + ': ' + body.message);
  return body;
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

  persistState(gameInfo, action) {
    this.setState(gameInfo);
    saveGame(gameInfo, action);
  }

  handleFieldClick(row, col) {
    let gameInfo = this.state;
    try {
      moves.makeMove(gameInfo.gameStates, row, col);
    } catch (err) {
      alert("Can't make the move: " + err.message);
      return;
    }
    this.persistState(gameInfo, {type: 'move', row, col});
  }

  handlePassPress() {
    let gameInfo = this.state;
    try {
      moves.pass(gameInfo.gameStates);
    } catch (err) {
      alert("Can't pass: " + err.message);
      return;
    }
    this.persistState(gameInfo, {type: 'pass'});
  }

  handleUndoPress() {
    let gameInfo = this.state;
    try {
      moves.undo(gameInfo.gameStates);
    } catch (err) {
      alert("Can't undo the move: " + err.message);
      return;
    }
    this.persistState(gameInfo, {type: 'undo'});
  }

  handleShowHideTerritory() {
    let gameInfo = this.state;
    gameInfo.showTerritory = !gameInfo.showTerritory;
    this.setState(gameInfo);
  }

  hasFieldMarker(size, row, col) {
    if (size === 19) {
      return (row === 3 || row === 9 || row === 15) && (col === 3 || col === 9 || col === 15);
    } else if (size === 13) {
      return (row === 3 || row === 6 || row === 9) && (col === 3 || col === 6 || col === 9);
    } else if (size === 9) {
      return ((row === 2 || row === 6) && (col === 2 || col === 6)) || (row === 4 && col === 4);
    }
  }

  getColor(selector) {
    const blackColor = 'black';
    const blackGradient = '#505050';
    const whiteColor = 'white';
    const whiteGradient = '#cccccc';
    const stoneColor = [blackGradient, whiteColor];
    const gradientColor = [blackColor, whiteGradient];
    const territoryColor = [blackColor, whiteColor];
    let index;
    if (typeof selector === 'boolean') {
      // In this case selector is equivalent to isBlack.
      index = selector ? 0 : 1;
    } else {
      // Otherwise, select is a number: 0 for none, 1 for black, 2 for white.
      if (selector === 0) {return {territory1: territoryColor[0], territory2: territoryColor[1]}}
      index = selector - 1;
    }
    return {main: stoneColor[index], gradient: gradientColor[index], territory: territoryColor[index]};
  }

  render() {
    let gameInfo = this.state;
    if (!gameInfo) return null;

    let gameState = gameInfo.gameStates[gameInfo.gameStates.length - 1];
    let size = gameState.size;

    const fieldSizePx = 65;
    const boardEdgePx = 30;
    const fontSizePx = 20;
    const fieldMarkerRadiusPx = 5;

    const stoneSizeRatio = 0.83;
    const lightOffsetRatio = 0.06;
    const markLastMoveRatio = 0.25;
    const markSquareRatio = 0.25;

    const stoneRadiusPx = fieldSizePx * stoneSizeRatio / 2;
    const lightOffsetPx = fieldSizePx * lightOffsetRatio;
    const markLastMoveRadiusPx = fieldSizePx * markLastMoveRatio / 2;
    const markSquareSizePx = fieldSizePx * markSquareRatio

    let boardSizePx = size * fieldSizePx + 2 * boardEdgePx;

    let arr = [];
    arr.push(<Rect key={'board'} x={0} y={0} width={boardSizePx} height={boardSizePx} fill={'#A06800'} />);

    for (let row = 0; row < size; row++) {
      let y = fieldSizePx * row + boardEdgePx;
      y += fieldSizePx / 2;
      y -= fontSizePx / 2;
      y++;  // Looks more symmetrical with +1.
      arr.push(<Text x={0} width={boardEdgePx} y={y} align={'center'} fontSize={fontSizePx} fontStyle={'bold'} text={row+1} />);
      let x = boardEdgePx + size * fieldSizePx;
      arr.push(<Text x={x} width={boardEdgePx} y={y} align={'center'} fontSize={fontSizePx} fontStyle={'bold'} text={row+1} />);
    }
    for (let col = 0; col < size; col++) {
      let charCode = 65 + (col < 8 ? col : col + 1);
      let char = String.fromCharCode(charCode);
      let x = fieldSizePx * col + boardEdgePx;
      let y = boardEdgePx / 2 - fontSizePx / 2;
      arr.push(<Text x={x} width={fieldSizePx} y={y} align={'center'} fontSize={fontSizePx} fontStyle={'bold'} text={char} />);
      y += boardEdgePx + size * fieldSizePx;
      arr.push(<Text x={x} width={fieldSizePx} y={y} align={'center'} fontSize={fontSizePx} fontStyle={'bold'} text={char} />);
    }

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        let x = fieldSizePx * col + boardEdgePx;
        let y = fieldSizePx * row + boardEdgePx;
        let xm = x + fieldSizePx / 2;
        let ym = y + fieldSizePx / 2;
        let xe = x + fieldSizePx;
        let ye = y + fieldSizePx;
        let handler = (!gameState.status && gameState.blackIsNext === gameInfo.selfIsBlack) ? () => this.handleFieldClick(row, col) : null;
        let key = row.toString() + ':' + col.toString();
        
        arr.push(<Rect key={'f'+key} x={x} y={y} width={fieldSizePx} height={fieldSizePx} fill={'#A06800'} onClick={handler} />);

        if (this.hasFieldMarker(size, row, col)) {
          arr.push(<Circle key={'cfm'+key} x={xm} y={ym} radius={fieldMarkerRadiusPx} fill={'black'} onClick={handler} />);
        }

        let x1 = col > 0 ? x : xm;
        let x2 = col < size - 1 ? xe : xm;
        let width = row > 0 && row < size - 1 ? 1 : 3;
        arr.push(<Line key={'lh'+key} points={[x1, ym, x2, ym]} stroke={'black'} strokeWidth={width} onClick={handler} />);
        let y1 = row > 0 ? y : ym;
        let y2 = row < size - 1 ? ye : ym;
        width = col > 0 && col < size - 1 ? 1 : 3;
        arr.push(<Line key={'lv'+key} points={[xm, y1, xm, y2]} stroke={'black'} strokeWidth={width} onClick={handler} />);

        let field = moves.getField(gameState.board, row, col);
        let color = this.getColor(field);
        if (field) {
          let circleProps = {
            key: 's'+key,
            x: xm,
            y: ym,
            radius: stoneRadiusPx,
            fillRadialGradientStartPoint: {x: -lightOffsetPx, y: -lightOffsetPx},
            fillRadialGradientEndPoint: {x: -lightOffsetPx, y: -lightOffsetPx},
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndRadius: stoneRadiusPx,
            fillRadialGradientColorStops: [0, color.main, 1, color.gradient],
            shadowOffset: {x:lightOffsetPx, y:lightOffsetPx},
            shadowColor: 'black',
            shadowOpacity: 0.2,
            onClick: handler,
          };
          arr.push(React.createElement('Circle', circleProps, null));
        }

        if (gameState.lastMove && gameState.lastMove.row === row && gameState.lastMove.col === col) {
          arr.push(<Circle key={'cls'+key} x={xm} y={ym} radius={markLastMoveRadiusPx} fill={'red'} onClick={handler} />);
        }

        if ((gameInfo.showTerritory || gameState.status) && !field) {
          field = moves.getField(gameState.territory, row, col);
          color = this.getColor(field);
          let rectProps = {
            key: 'm' + key,
            x: xm - markSquareSizePx/2,
            y: ym - markSquareSizePx/2,
            width: markSquareSizePx,
            height: markSquareSizePx,
            onClick: handler,
          };
          if (field) {
            rectProps.fill = color.territory;
          } else {
            rectProps.fillLinearGradientStartPoint = {x: 0, y: 0};
            rectProps.fillLinearGradientEndPoint = {x: markSquareSizePx, y: markSquareSizePx};
            rectProps.fillLinearGradientColorStops = [0, color.territory1, 1, color.territory2];
          }

          arr.push(React.createElement('Rect', rectProps, null));
        }
      }
    }

    const spacingPx = 20;
    const paddingPx = 10;
    const playerInfoWidthPx = 400;
    const playerInfoHeightPx = 90;
    const playerInfoRectWidthPx = playerInfoWidthPx + 2*paddingPx;
    const playerInfoRectHeightPx = playerInfoHeightPx + 2*paddingPx;
    const playerFontSize = playerInfoHeightPx / 5;

    let key = 'p1';

    let nameText = gameInfo.selfName;
    let moveText = gameState.status
        ? (gameInfo.selfIsBlack === (gameState.status === 1) ? 'WINNER!' : 'loser!')
        : (gameInfo.selfIsBlack === gameState.blackIsNext ? 'MOVE' + ' [' + millisToHHMMSS(Date.now() - gameState.timestamp) + ']' : 'waiting for the opponent...');
    let stonesOnBoardText = "Stones on board: " + (gameInfo.selfIsBlack ? gameState.blackStonesOnBoard : gameState.whiteStonesOnBoard);
    let stonesCapturedText = "Opponent stones captured: " + (gameInfo.selfIsBlack ? gameState.whiteStonesCaptured : gameState.blackStonesCaptured);
    let scoreText = "Score: " + (gameInfo.selfIsBlack ? gameState.blackStonesOnBoard + gameState.blackTerritorySize : gameState.whiteStonesOnBoard + gameState.whiteTerritorySize + 7.5);

    let p1Arr = [];
    let ix = 0;
    let iy = 0;
    p1Arr.push(<Rect key={key+'info'} x={ix} y={iy} width={playerInfoRectWidthPx} height={playerInfoRectHeightPx} fill={'#A06800'} />);
    p1Arr.push(<Text key={key+'tn'} x={ix + playerInfoHeightPx + 2*paddingPx} y={iy + paddingPx} align={'left'} fontSize={playerFontSize-1} fontStyle={'bold'} text={nameText} />);
    p1Arr.push(<Text key={key+'tm'} x={ix + playerInfoHeightPx + 2*paddingPx} y={iy + paddingPx + playerFontSize} align={'left'} fontSize={playerFontSize-1} text={moveText} />);
    p1Arr.push(<Text key={key+'tsob'} x={ix + playerInfoHeightPx + 2*paddingPx} y={iy + paddingPx + 2*playerFontSize} align={'left'} fontSize={playerFontSize-1} text={stonesOnBoardText} />);
    p1Arr.push(<Text key={key+'tsc'} x={ix + playerInfoHeightPx + 2*paddingPx} y={iy + paddingPx + 3*playerFontSize} align={'left'} fontSize={playerFontSize-1} text={stonesCapturedText} />);
    p1Arr.push(<Text key={key+'ts'} x={ix + playerInfoHeightPx + 2*paddingPx} y={iy + paddingPx + 4*playerFontSize} align={'left'} fontSize={playerFontSize-1} text={scoreText} />);
    let color = this.getColor(gameInfo.selfIsBlack);    {
      let circleProps = {
        key: key + 's',
        x: ix + paddingPx + playerInfoHeightPx/2,
        y: iy + paddingPx + playerInfoHeightPx/2,
        radius: stoneRadiusPx,
        fillRadialGradientStartPoint: {x: -lightOffsetPx, y: -lightOffsetPx},
        fillRadialGradientEndPoint: {x: -lightOffsetPx, y: -lightOffsetPx},
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndRadius: stoneRadiusPx,
        fillRadialGradientColorStops: [0, color.main, 1, color.gradient],
        shadowOffset: {x:lightOffsetPx, y:lightOffsetPx},
        shadowColor: 'black',
        shadowOpacity: 0.2,
      };
      p1Arr.push(React.createElement('Circle', circleProps, null));
    }

    key = 'p2';

    nameText = gameInfo.opponentName;
    moveText = gameState.status
        ? (gameInfo.selfIsBlack !== (gameState.status === 1) ? 'WINNER!' : 'loser!')
        : (gameInfo.selfIsBlack !== gameState.blackIsNext ? 'MOVE' + ' [' + millisToHHMMSS(Date.now() - gameState.timestamp) + ']' : 'waiting for the opponent...');
    stonesOnBoardText = "Stones on board: " + (!gameInfo.selfIsBlack ? gameState.blackStonesOnBoard : gameState.whiteStonesOnBoard);
    stonesCapturedText = "Opponent stones captured: " + (!gameInfo.selfIsBlack ? gameState.whiteStonesCaptured : gameState.blackStonesCaptured);
    scoreText = "Score: " + (!gameInfo.selfIsBlack ? gameState.blackStonesOnBoard + gameState.blackTerritorySize : gameState.whiteStonesOnBoard + gameState.whiteTerritorySize + 7.5);

    let p2Arr = [];
    ix = 0;
    iy = 0;
    p2Arr.push(<Rect key={key+'info'} x={ix} y={iy} width={playerInfoRectWidthPx} height={playerInfoRectHeightPx} fill={'#A06800'} />);
    p2Arr.push(<Text key={key+'tn'} x={ix + playerInfoHeightPx + 2*paddingPx} y={iy + paddingPx} align={'left'} fontSize={playerFontSize-1} fontStyle={'bold'} text={nameText} />);
    p2Arr.push(<Text key={key+'tm'} x={ix + playerInfoHeightPx + 2*paddingPx} y={iy + paddingPx + playerFontSize} align={'left'} fontSize={playerFontSize-1} text={moveText} />);
    p2Arr.push(<Text key={key+'tsob'} x={ix + playerInfoHeightPx + 2*paddingPx} y={iy + paddingPx + 2*playerFontSize} align={'left'} fontSize={playerFontSize-1} text={stonesOnBoardText} />);
    p2Arr.push(<Text key={key+'tsc'} x={ix + playerInfoHeightPx + 2*paddingPx} y={iy + paddingPx + 3*playerFontSize} align={'left'} fontSize={playerFontSize-1} text={stonesCapturedText} />);
    p2Arr.push(<Text key={key+'ts'} x={ix + playerInfoHeightPx + 2*paddingPx} y={iy + paddingPx + 4*playerFontSize} align={'left'} fontSize={playerFontSize-1} text={scoreText} />);
    color = this.getColor(!gameInfo.selfIsBlack);
    {
      let circleProps = {
        key: key + 's',
        x: ix + paddingPx + playerInfoHeightPx/2,
        y: iy + paddingPx + playerInfoHeightPx/2,
        radius: stoneRadiusPx,
        fillRadialGradientStartPoint: {x: -lightOffsetPx, y: -lightOffsetPx},
        fillRadialGradientEndPoint: {x: -lightOffsetPx, y: -lightOffsetPx},
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndRadius: stoneRadiusPx,
        fillRadialGradientColorStops: [0, color.main, 1, color.gradient],
        shadowOffset: {x:lightOffsetPx, y:lightOffsetPx},
        shadowColor: 'black',
        shadowOpacity: 0.2,
      };
      p2Arr.push(React.createElement('Circle', circleProps, null));
    }

    return (
      <div>
        <div style={{float: "left", width: boardSizePx, height: boardSizePx}}>
          <Stage width={boardSizePx} height={boardSizePx}>
            <Layer>
              {arr}
            </Layer>
          </Stage>
        </div>
        <div style={{float: "left", width: spacingPx, height: boardSizePx}} />
        <div style={{float: "left", width: playerInfoWidthPx, height: boardSizePx}}>
          <div>
            <div style={{width: playerInfoRectWidthPx, height: playerInfoRectHeightPx}}>
              <Stage width={playerInfoRectWidthPx} height={playerInfoRectHeightPx}>
                <Layer>
                  {p1Arr}
                </Layer>
              </Stage>
            </div>
            <div className="buttons" style={{width: playerInfoRectWidthPx, height: boardSizePx-2*playerInfoRectHeightPx}}>
              <table style={{width: playerInfoRectWidthPx, height: boardSizePx-2*playerInfoRectHeightPx}}>
                <tr><td>
                  <button onClick={() => this.handlePassPress()} hidden={gameState.status} disabled={gameState.blackIsNext !== gameInfo.selfIsBlack}>Pass</button>
                  <br/>
                  <button onClick={() => this.handleUndoPress()} disabled={gameInfo.gameStates.length <= 1 || gameState.blackIsNext === gameInfo.selfIsBlack}>Undo</button>
                  <br/>
                  <button onClick={() => this.handleShowHideTerritory()} hidden={gameState.status}>{(gameInfo.showTerritory ? 'Hide' : 'Show') + ' territory'}</button>
                </td></tr>
              </table>
            </div>
            <div style={{width: playerInfoRectWidthPx, height: playerInfoRectHeightPx}}>
              <Stage width={playerInfoRectWidthPx} height={playerInfoRectHeightPx}>
                <Layer>
                  {p2Arr}
                </Layer>
              </Stage>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class NewGame extends React.Component {
  constructor(props) {
    super(props);

    saveFreshGame(this.constructGameSeed(Number(this.props.match.params.size)))
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

  handleStartButtonClick() {
    let o = document.getElementById("opponent");
    if (o.selectedIndex === 0) {
      alert("No opponenet selected")
      return;
    }
    let s = document.getElementById("size");
    let redirect = "/new/u/" + this.state.id + "/o/" + o.options[o.selectedIndex].value + "/s/" + s.options[s.selectedIndex].value;
    this.setState({redirect: redirect});
  }

  render() {
    if (!this.state) return null;

    if (this.state.redirect) {
      return (<Redirect to={this.state.redirect} />);
    }

    let opponentOptionTemplate = this.state.otherUsers.map(v => (
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
          <button onClick={() => this.handleStartButtonClick()}>
            Start a new game
          </button>
          &nbsp;against&nbsp;
          <select id="opponent">
            <option />
            {opponentOptionTemplate}
          </select>
          &nbsp;on board size&nbsp;
          <select id="size">
            <option value="9">9x9</option>
            <option value="13">13x13</option>
            <option value="19">19x19</option>
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
        <Route exact path="/new/u/:userId/o/:opponentId/s/:size" component={NewGame} />
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
