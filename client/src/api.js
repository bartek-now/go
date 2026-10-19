async function readResponse(response) {
  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw Error('Received status ' + response.status + ': invalid server response');
  }
  if (response.status !== 200) {
    throw Error(body.message || 'Received status ' + response.status);
  }
  return body;
}

export const loadUser = async (userLogin) => {
  const response = await fetch('/api/loaduser/' + userLogin);
  const body = await readResponse(response);
  return body;
}

export const loadGame = async (playerId) => {
  const response = await fetch('/api/loadgame/' + playerId);
  const body = await readResponse(response);
  return body;
}

export const saveGame = async (gameInfo, action) => {
  const response = await fetch('/api/savegame/' + gameInfo.gameId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({action, revision: gameInfo.revision}),
  });
  const body = await readResponse(response);
  return body;
}

export const saveFreshGame = async (gameSeed) => {
  const response = await fetch('/api/newgame/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameSeed),
  });
  const body = await readResponse(response);
  return body;
}
