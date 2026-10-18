import * as moves from './moves';
import Game from './Game';
import {loadUser, saveFreshGame} from './api';
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
