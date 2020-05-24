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
        'SELECT g.id AS game_id,g.state,p1.is_black,u1.name AS self_name,u2.name AS opponent_name '
            + 'FROM Games g,GamePlayers p1,GamePlayers p2,Users u1, Users u2 '
            + 'WHERE p1.id=$1::text AND p1.game_id=g.id AND p1.game_id=p2.game_id AND p1.user_id<>p2.user_id AND p1.user_id=u1.id AND p2.user_id=u2.id',
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
        gameStates: JSON.parse(result.rows[0].state),
        selfIsBlack: result.rows[0].is_black,
        selfName:  result.rows[0].self_name,
        opponentName:  result.rows[0].opponent_name,
      });
    });
  });
}

const saveGameToDb = (gameId, gameStates) => {
  return new Promise(function(resolve, reject) {
    pool.query(
        'UPDATE Games SET state=$2::text WHERE id=$1::text',
        [gameId, JSON.stringify(gameStates)],
        error => {
      if (error) {
        reject(error)
        return;
      }
      resolve();
    });
  });
}

const insertNewGameIntoDb = (gameSeed, randState) => {
  return new Promise(async function(resolve, reject) {
    // TODO: Convert into transactions.
    try {
      await pool.query(
          'INSERT INTO Games (id, state) VALUES ($1::text, $2::text)', [randState.gameId.toString(), JSON.stringify([gameSeed.gameState])]);
      await pool.query(
          'INSERT INTO GamePlayers (id, user_id, game_id, is_black) VALUES ($1::text, $2::text, $3::text, $4::bool)',
          [randState.selfPlayerId.toString(), gameSeed.selfUserId, randState.gameId.toString(), randState.selfIsBlack]);
      await pool.query(
        'INSERT INTO GamePlayers (id, user_id, game_id, is_black) VALUES ($1::text, $2::text, $3::text, $4::bool)',
        [randState.opponentPlayerId.toString(), gameSeed.opponentUserId, randState.gameId.toString(), !randState.selfIsBlack]);
      } catch(error) {
      reject(error)
      return;
    }
    resolve();
  });
}

const loadUserFromDb = (userLogin) => {
  return new Promise(async function(resolve, reject) {
    try {
      // TODO: Convert into transactions.
      let result1 = await pool.query('SELECT id,name FROM Users WHERE login=$1::text', [userLogin]);
      if (result1.rows.length == 0)
        throw "User '" + userLogin + "' not found";
      let userId = result1.rows[0].id;
      let userName = result1.rows[0].name;

      let result2 = await pool.query(
          'SELECT p1.id AS player_id,p1.is_black,p2.user_id,u.name '
              + 'FROM GamePlayers p1,GamePlayers p2,Users u '
              + 'WHERE p1.user_id=$1::text AND p1.game_id=p2.game_id AND p1.user_id<>p2.user_id AND p2.user_id=u.id',
          [userId]);
      let games = [];
      for (let i = 0; i < result2.rows.length; ++i) {
        let row = result2.rows[i];
        games.push({
          selfPlayerId: row.player_id,
          selfIsBlack: row.is_black,
          opponentUserId: row.user_id,
          opponentName: row.name,
        });
      }

      let result3 = await pool.query('SELECT id,name FROM Users WHERE id<>$1::text', [userId]);
      let otherUsers = [];
      for (let i = 0; i < result3.rows.length; ++i) {
        let row = result3.rows[i];
        otherUsers.push({
          id: row.id,
          name: row.name,
        });
      }

      let userInfo = {
        id: userId,
        name: userName,
        games: games,
        otherUsers: otherUsers,
      };
      resolve(userInfo);
    } catch(error) {
      reject(error)
      return;
    }
  });
}

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/loaduser/:userLogin', (req, res) => {
  console.log("Loading user profile:", req.params.userLogin);
  loadUserFromDb(req.params.userLogin)
      .then(userInfo => {
        res.send(userInfo);
      })
      .catch(reason => {
        console.log("Failure when reading user profile from DB: ", reason);
        res.status(500).send({message: reason.toString()});
      });
});

app.get('/api/loadgame/:playerId', (req, res) => {
  console.log("Loading game for player ID:", req.params.playerId);
  loadGameFromDb(req.params.playerId)
      .then(gameInfo => {
        if (gameInfo) {
          res.send(gameInfo);
        } else{
          console.log("No read game from DB");
          res.status(204).send({message: "game not found"});
        }
      })
      .catch(reason => {
        console.log("Failure when reading game from DB:", reason);
        res.status(500).send({message: reason.toString()});
      });
});

app.post('/api/savegame/:gameId', (req, res) => {
  console.log("Saving game ID:", req.params.gameId);
  let gameState = req.body;
  saveGameToDb(req.params.gameId, gameState)
      .then(() => {
        console.log("Successfully wrote game to DB");
        res.send({message: "OK"});
      })
      .catch(reason => {
        console.log("Failure when writing game to DB:", reason);
        res.status(500).send({message: reason.toString()});
      });
});

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

app.post('/api/newgame/', (req, res) => {
  console.log("Creating a new game ID");
  let randState = {
    gameId: getRandomInt(100000),
    selfPlayerId: getRandomInt(100000),
    opponentPlayerId: getRandomInt(100000),
    selfIsBlack: Math.random() < 0.5,
  };
  let gameSeed = req.body;
  insertNewGameIntoDb(gameSeed, randState)
      .then(() => {
        console.log("Successfully inserted a new game into DB");
        res.send({playerId: randState.selfPlayerId});
      })
      .catch(reason => {
        console.log("Failure when inserting a new game into DB:", reason);
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