const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// This was needed to avoid pg-native issue.
// https://github.com/serverless-heaven/serverless-webpack/issues/78#issuecomment-271336996
const Pool = require('pg').Pool

// TODO: Don't show the password to the entire world!
const pool = new Pool({
  user: 'zkmzsgqmovqbrv',
  host: 'ec2-54-152-175-141.compute-1.amazonaws.com',
  database: 'd131oid7lp7bhj',
  password: 'fce9deec2a53dac7b9bb8661198e3379a33daa2c3a29b9b219d6f43f5e679eda',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  }
});

const loadGameFromDb = (playerId) => {
  return new Promise(function(resolve, reject) {
    pool.query(
        'SELECT game_id,state,is_black FROM GamePlayers p,Games g WHERE game_id=g.id AND p.id=$1::text',
        [playerId],
        (error, result) => {
      if (error) {
        reject(error)
        return;
      }
      if (!result.rows[0]) {
        resolve(null);
        return;
      }
      resolve({
        gameId: result.rows[0].game_id,
        gameState: JSON.parse(result.rows[0].state),
        isBlack: result.rows[0].isBlack
      });
    });
  });
}

const saveGameToDb = (gameId, gameState) => {
  return new Promise(function(resolve, reject) {
    pool.query(
        'UPDATE Games SET state=$2::text WHERE id=$1::text',
        [gameId, gameState],
        error => {
      if (error) {
        reject(error)
        return;
      }
      resolve();
    });
  });
}

const insertNewGameIntoDb = (ids, gameState) => {
  return new Promise(async function(resolve, reject) {
    // TODO: Convert into transactions.
    try {
      await pool.query(
          'INSERT INTO Games (id, state) VALUES ($1::text, $2::text)', [ids.gameId.toString(), gameState]);
      await pool.query(
          'INSERT INTO GamePlayers (id, game_id, is_black) VALUES ($1::text, $2::text, FALSE)',
          [ids.whitePlayerId.toString(), ids.gameId.toString()]);
      await pool.query(
          'INSERT INTO GamePlayers (id, game_id, is_black) VALUES ($1::text, $2::text, TRUE)',
          [ids.blackPlayerId.toString(), ids.gameId.toString()]);
    } catch(error) {
      reject(error)
      return;
    }
    resolve();
  });
}

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/load/:playerId', (req, res) => {
  console.log("Loading game for player ID: ", req.params.playerId);
  loadGameFromDb(req.params.playerId)
      .then(gameInfo => {
        if (gameInfo) {
          console.log("Successfully read game from DB: ", gameInfo);
          res.send(gameInfo);
        } else{
          console.log("No read game from DB");
          res.status(204).send({message: "game not found"});
        }
      })
      .catch(reason => {
        console.log("Failure when reading game from DB: ", reason);
        res.status(500).send({message: reason.toString()});
      });
});

app.post('/api/save/:gameId', (req, res) => {
  console.log("Saving game ID: ", req.params.gameId, "\n", req.body);
  let gameState = req.body;
  saveGameToDb(req.params.gameId, gameState)
      .then(() => {
        console.log("Successfully wrote game to DB");
        res.send({message: "OK"});
      })
      .catch(reason => {
        console.log("Failure when writing game to DB: ", reason);
        res.status(500).send({message: reason.toString()});
      });
});

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

app.post('/api/new/', (req, res) => {
  console.log("Creating a new game ID:\n", req.body);
  let ids = {
    gameId: getRandomInt(100000),
    whitePlayerId: getRandomInt(100000),
    blackPlayerId: getRandomInt(100000),
  };
  let gameState = req.body;
  insertNewGameIntoDb(ids, gameState)
      .then(() => {
        console.log("Successfully inserted a new game into DB");
        res.send(ids);
      })
      .catch(reason => {
        console.log("Failure when inserting a new game into DB: ", reason);
        res.status(500).send({message: reason.toString()});
      });
});

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'client/build')));

  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(port, () => console.log(`Listening on port ${port}`));