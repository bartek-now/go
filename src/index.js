import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

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
    let size = parseInt(props.size);
    this.state = {
      size: size,
      squares: Array.from(Array(size), () => new Array(size)),
      blackIsNext: true,
    };
  }

  handleClick(row, col) {
    if (this.state.squares[row][col]) return;
    const squares = this.state.squares.slice();
    squares[row][col] = this.state.blackIsNext ? 'B' : 'W';
    this.setState({
      squares: squares,
      blackIsNext: !this.state.blackIsNext,
    });
  }

  renderSquare(row, col) {
    return <Square value={this.state.squares[row][col]} onClick={() => this.handleClick(row, col)} />;
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
    status = 'Next player: ' + (this.state.blackIsNext ? 'B' : 'W');

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
          <Board size="9" />
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
