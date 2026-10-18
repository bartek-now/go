import * as moves from './moves';
import Game from './Game';
import {saveFreshGame} from './api';
import User from './User';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  BrowserRouter as Router,
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
