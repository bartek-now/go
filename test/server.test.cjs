const {test} = require('node:test');
const assert = require('node:assert/strict');
const {once} = require('node:events');
const {createApp} = require('../server');
const moves = require('../client/src/moves');

function memoryPool(history) {
  return {
    state: JSON.stringify(history),
    writes: 0,
    revision: 0,
    query(sql, params, callback) {
      if (sql.startsWith('SELECT state')) {
        return Promise.resolve({rows: this.state === null ? [] : [{state: this.state, revision: this.revision}]});
      }
      if (sql.startsWith('UPDATE Games')) {
        assert.ok(sql.includes('WHERE id=$1::text AND revision=$3::int RETURNING revision'));
        if (params[2] !== this.revision) return Promise.resolve({rowCount: 0, rows: []});
        this.revision++;
        this.state = params[1];
        this.writes++;
        const result = {rowCount: 1, rows: [{revision: this.revision}]};
        if (callback) { callback(null, result); return; }
        return Promise.resolve(result);
      }
      throw Error('Unexpected query: ' + sql);
    }
  };
}

async function serve(t, pool) {
  const server = createApp(pool).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

async function save(url, body) {
  return fetch(url + '/api/savegame/game', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(Array.isArray(body) ? body : {revision: 0, ...body})
  });
}

function largeHistory() {
  const history = [moves.constructInitialState(19)];
  let seed = 734;
  while (Buffer.byteLength(JSON.stringify(history)) <= 100 * 1024) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const index = seed % (19 * 19);
    try { moves.makeMove(history, Math.floor(index / 19), index % 19); } catch (_) {}
  }
  return history;
}

test('small action requests save games with histories larger than 100 KB', async t => {
  const history = largeHistory();
  const pool = memoryPool(history);
  const url = await serve(t, pool);
  const response = await save(url, {action: {type: 'pass'}});
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.gameStates.length, history.length + 1);
  assert.equal(result.gameStates.at(-1).passCnt, 1);
  assert.deepEqual(JSON.parse(pool.state), result.gameStates);
});

test('the server applies moves and undoes using its stored history', async t => {
  const pool = memoryPool([moves.constructInitialState(9)]);
  const url = await serve(t, pool);
  let response = await save(url, {action: {type: 'move', row: 2, col: 3}});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).gameStates.at(-1).board[2][3], 1);
  response = await save(url, {revision: 1, action: {type: 'undo'}});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).gameStates.length, 1);
});

test('invalid actions cannot replace or corrupt stored history', async t => {
  const pool = memoryPool([moves.constructInitialState(9)]);
  const original = pool.state;
  const url = await serve(t, pool);
  for (const body of [[], {}, {action: {type: 'replace'}}, {action: {type: 'move', row: -1, col: 0}}, {action: {type: 'move', row: 0, col: 9}}, {action: {type: 'move', row: 0.5, col: 0}}]) {
    const response = await save(url, body);
    assert.equal(response.status, 400);
  }
  assert.equal(pool.state, original);
  assert.equal(pool.writes, 0);
});

test('saving a missing game returns a JSON 404', async t => {
  const pool = memoryPool([]);
  pool.state = null;
  const url = await serve(t, pool);
  const response = await save(url, {action: {type: 'pass'}});
  assert.equal(response.status, 404);
  assert.equal((await response.json()).message, 'Game not found');
});


test('concurrent actions from the same revision accept exactly one write', async t => {
  const pool = memoryPool([moves.constructInitialState(9)]);
  const originalQuery = pool.query.bind(pool);
  const readers = [];
  pool.query = (sql, params, callback) => {
    if (sql.startsWith('SELECT state')) {
      const snapshot = {rows: [{state: pool.state, revision: pool.revision}]};
      return new Promise(resolve => {
        readers.push(() => resolve(snapshot));
        if (readers.length === 2) readers.forEach(reader => reader());
      });
    }
    return originalQuery(sql, params, callback);
  };
  const url = await serve(t, pool);
  const responses = await Promise.all([
    save(url, {action: {type: 'move', row: 0, col: 0}}),
    save(url, {action: {type: 'move', row: 1, col: 1}})
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal(pool.writes, 1);
  assert.equal(pool.revision, 1);
  assert.equal(JSON.parse(pool.state).length, 2);
});

test('undo increments the revision and old requests cannot be replayed', async t => {
  const pool = memoryPool([moves.constructInitialState(9)]);
  const url = await serve(t, pool);
  assert.equal((await save(url, {action: {type: 'move', row: 0, col: 0}})).status, 200);
  const undo = await save(url, {revision: 1, action: {type: 'undo'}});
  assert.equal(undo.status, 200);
  assert.equal((await undo.json()).revision, 2);
  assert.equal((await save(url, {revision: 0, action: {type: 'pass'}})).status, 409);
  assert.equal(pool.writes, 2);
  assert.equal(JSON.parse(pool.state).length, 1);
});

test('missing or invalid revisions are rejected before any write', async t => {
  const pool = memoryPool([moves.constructInitialState(9)]);
  const url = await serve(t, pool);
  for (const revision of [undefined, -1, 0.5, '0']) {
    assert.equal((await save(url, {revision, action: {type: 'pass'}})).status, 400);
  }
  assert.equal(pool.writes, 0);
});


test('loading a game includes its persisted revision', async t => {
  const history = [moves.constructInitialState(9)];
  const pool = {query(sql, params, callback) {
    assert.ok(sql.includes('g.revision'));
    callback(null, {rows: [{game_id: 'game', state: JSON.stringify(history), revision: 7, is_black: true, self_name: 'Black', opponent_name: 'White'}]});
  }};
  const url = await serve(t, pool);
  const response = await fetch(url + '/api/loadgame/player');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).revision, 7);
});


function transactionPool({failInsert = 0, failBegin = false, failCommit = false, failRollback = false, commitGate} = {}) {
  let inserts = 0;
  let staged = [];
  const pool = {
    committed: [], calls: [], releases: [], connects: 0,
    query() { throw Error('Transaction queries must use the checked-out client'); },
    async connect() { this.connects++; return client; }
  };
  const client = {
    async query(sql, params) {
      pool.calls.push({sql, params});
      if (sql === 'BEGIN') {
        if (failBegin) throw Error('begin failed');
        staged = [];
      } else if (sql.startsWith('INSERT')) {
        inserts++;
        if (inserts === failInsert) throw Error('insert failed');
        staged.push({sql, params});
      } else if (sql === 'COMMIT') {
        if (commitGate) await commitGate();
        if (failCommit) throw Error('commit failed');
        pool.committed.push(...staged);
        staged = [];
      } else if (sql === 'ROLLBACK') {
        if (failRollback) throw Error('rollback failed');
        staged = [];
      } else throw Error('Unexpected client query');
      return {rows: [], rowCount: 1};
    },
    release(error) { pool.releases.push(error); }
  };
  return pool;
}

function createGame(url) {
  return fetch(url + '/api/newgame/', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({selfUserId: 'one', opponentUserId: 'two', gameState: moves.constructInitialState(9)})
  });
}

test('new games commit all three records on one connection before responding', async t => {
  let notifyCommit;
  let finishCommit;
  const reachedCommit = new Promise(resolve => { notifyCommit = resolve; });
  const gate = new Promise(resolve => { finishCommit = resolve; });
  const pool = transactionPool({commitGate: () => { notifyCommit(); return gate; }});
  const url = await serve(t, pool);
  let responded = false;
  const pending = createGame(url).then(response => { responded = true; return response; });
  await reachedCommit;
  assert.equal(responded, false);
  assert.equal(pool.committed.length, 0);
  finishCommit();
  const response = await pending;
  assert.equal(response.status, 200);
  assert.equal(typeof (await response.json()).playerId, 'number');
  assert.equal(pool.connects, 1);
  assert.deepEqual(pool.calls.map(call => call.sql.split(' ')[0]), ['BEGIN', 'INSERT', 'INSERT', 'INSERT', 'COMMIT']);
  assert.equal(pool.committed.length, 3);
  const [, self, opponent] = pool.committed;
  assert.equal(self.params[1], 'one');
  assert.equal(opponent.params[1], 'two');
  assert.equal(self.params[2], opponent.params[2]);
  assert.equal(self.params[3], !opponent.params[3]);
  assert.deepEqual(pool.releases, [undefined]);
});

for (const failInsert of [1, 2, 3]) {
  test('insert failure ' + failInsert + ' rolls back without partial game records', async t => {
    const pool = transactionPool({failInsert});
    const url = await serve(t, pool);
    const response = await createGame(url);
    assert.equal(response.status, 500);
    assert.match((await response.json()).message, /insert failed/);
    assert.equal(pool.committed.length, 0);
    assert.equal(pool.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(pool.calls.some(call => call.sql === 'COMMIT'), false);
    assert.deepEqual(pool.releases, [undefined]);
  });
}

for (const phase of ['Begin', 'Commit']) {
  test(phase + ' failure also rolls back and releases the connection', async t => {
    const pool = transactionPool({['fail' + phase]: true});
    const url = await serve(t, pool);
    assert.equal((await createGame(url)).status, 500);
    assert.equal(pool.committed.length, 0);
    assert.equal(pool.calls.at(-1).sql, 'ROLLBACK');
    assert.deepEqual(pool.releases, [undefined]);
  });
}

test('rollback failure discards the connection and preserves the original error', async t => {
  const pool = transactionPool({failInsert: 3, failRollback: true});
  const url = await serve(t, pool);
  const response = await createGame(url);
  assert.equal(response.status, 500);
  assert.match((await response.json()).message, /insert failed/);
  assert.equal(pool.releases.length, 1);
  assert.match(pool.releases[0].message, /rollback failed/);
});

test('failure to acquire a database connection returns an error response', async t => {
  const pool = {async connect() { throw Error('connection failed'); }};
  const url = await serve(t, pool);
  const response = await createGame(url);
  assert.equal(response.status, 500);
  assert.match((await response.json()).message, /connection failed/);
});
