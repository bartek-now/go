import React from 'react';
import {Link, Redirect} from 'react-router-dom';
import {loadUser} from './api';
import {startPolling} from './polling';

export default class User extends React.Component {
  constructor(props) {
    super(props);
    this.state = {isLoading: true};
  }

  componentDidMount() {
    this.startLoadingUser();
  }

  componentDidUpdate(previousProps) {
    if (previousProps.match.params.userLogin !== this.props.match.params.userLogin) {
      this.stopPolling();
      this.startLoadingUser();
    }
  }

  componentWillUnmount() {
    this.stopPolling();
  }

  startLoadingUser() {
    const userLogin = this.props.match.params.userLogin;
    this.setState({isLoading: true, loadError: null, redirect: null});
    this.stopPolling = startPolling(
        signal => loadUser(userLogin, {signal}),
        userInfo => this.setState({...userInfo, isLoading: false, loadError: null}),
        error => this.setState({loadError: 'Could not refresh the profile: ' + error.message}));
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
    if (this.state.isLoading) {
      return this.state.loadError
          ? <div role="alert">{this.state.loadError}</div>
          : <div role="status">Loading profile...</div>;
    }

    if (this.state.redirect) {
      return (<Redirect to={this.state.redirect} />);
    }

    let opponentOptionTemplate = this.state.otherUsers.map(v => (
      <option key={v.id} value={v.id}>{v.name}</option>
    ));
    let gameTemplate = this.state.games.map(v => {
      let link = "/p/" + v.selfPlayerId;
      let color = v.selfIsBlack ? 'Black' : 'White';
      return (<li key={v.selfPlayerId}><Link to={link}>Playing as {color} against {v.opponentName}</Link></li>);
    });

    return (
      <div>
        {this.state.loadError && <div role="alert">{this.state.loadError}</div>}
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
