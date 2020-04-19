const express = require('express');
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
});

const loadGameState = (id) => {
  return new Promise(function(resolve, reject) {
    pool.query('SELECT State FROM Games WHERE id=$1', [id], (error, results) => {
      if (error) {
        reject(error)
      }
      resolve(results.rows[0]);
    })
  }) 
}

const saveGameState = (id, gameState) => {
  return new Promise(function(resolve, reject) {
    pool.query('INSERT INTO Games (name, email) VALUES ($1, $2) RETURNING *', [id, gameState.serializeBinary()], (error, results) => {
      if (error) {
        reject(error)
      }
      resolve(`Game state has been saved: ${results.rows[0]}`)
    })
  }).then(() => alert('DB write succeeded')).catch((reason) => alert('DB write failed ' + reason))
}

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var saved = {};

app.get('/api/load', (req, res) => {
  res.send(saved);
});

app.post('/api/save', (req, res) => {
  console.log(req.body);
  saved = {gameState: req.body};
  res.send({status: "OK"});
});

app.listen(port, () => console.log(`Listening on port ${port}`));