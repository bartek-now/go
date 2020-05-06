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

const loadGameStateFromDb = (id) => {
  return new Promise(function(resolve, reject) {
    pool.query('SELECT state FROM Games WHERE id=$1::text', [id], (error, result) => {
      if (error) {
        reject(error)
        return;
      }
      if (!result.rows[0]) {
        resolve(null);
        return;
      }
      console.log(result);
      resolve(JSON.parse(result.rows[0].state));
    })
  }) 
}

const saveGameStateToDb = (id, gameState) => {
  return new Promise(function(resolve, reject) {
    pool.query('INSERT INTO Games (id, state) VALUES ($1::text, $2::text) ON CONFLICT(id) DO UPDATE SET state=$2::text', [id, gameState], (error) => {
      if (error) {
        reject(error)
        return;
      }
      resolve();
    })
  })
}

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/load/:id', (req, res) => {
  console.log("Loading game ID: ", req.params.id);
  loadGameStateFromDb(req.params.id)
      .then(gameState => {
        if (gameState) {
          console.log("Successfully read state from DB: ", gameState);
          res.send({gameState: gameState});
        } else{
          console.log("No read state from DB");
          res.status(204).send("game not found");
        }
      })
      .catch(reason => {
        console.log("Failure when reading state from DB: ", reason);
        res.status(500).send(reason);
      });
});

app.post('/api/save/:id', (req, res) => {
  console.log("Saving game ID: ", req.params.id, "\n", req.body);
  saveGameStateToDb(req.params.id, req.body)
      .then(() => {
        console.log("Successfully wrote state to DB");
        res.send("OK");
      })
      .catch(reason => {
        console.log("Failure when writing state from DB: ", reason);
        res.status(500).send(reason);
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