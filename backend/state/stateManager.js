// Este módulo simula una base de datos en memoria para el estado de la aplicación.

let players = []; // Almacena { name: string, score: number, role: 'player' | 'admin', socketId: string }
let roomState = { isPlaying: false, time: 0, gameStartTime: null };

// --- Gestión de Jugadores ---

const addPlayer = (name, socketId, time, token) => {
  if (players.length === 0) {
    roomState.time = time;
  }
  const newPlayer = {
    name,
    score: 0,
    role: players.length === 0 ? 'admin' : 'player',
    socketId,
    isReady: players.length === 0 ? true : false, // Host is always ready
    token,
    disconnected: false,
    currentPage: 'login',
  };
  players.push(newPlayer);
  return newPlayer;
};

const disconnectPlayerBySocketId = (socketId) => {
  const player = players.find(p => p.socketId === socketId);
  if (player) {
    player.disconnected = true;
  }
  return player;
};

const removePlayerBySocketId = (socketId) => {
  console.log('stateManager: removePlayerBySocketId called for:', socketId);
  console.log('stateManager: current players before removal:', players.map(p => ({ name: p.name, socketId: p.socketId })));
  const index = players.findIndex(p => p.socketId === socketId);
  if (index !== -1) {
    const removedPlayer = players.splice(index, 1)[0];
    if (removedPlayer.role === 'admin' && players.length > 0) {
      players[0].role = 'admin';
      players[0].isReady = true; // New admin is also ready
    }
    console.log('stateManager: player removed. current players after removal:', players.map(p => ({ name: p.name, socketId: p.socketId })));
    return removedPlayer;
  }
  console.log('stateManager: player not found for removal.');
  return null;
};

const getPlayers = () => players;

const findPlayerByName = (name) => players.find(p => p.name.toLowerCase() === name.toLowerCase());

const updatePlayerScore = (name, score) => {
  const player = findPlayerByName(name);
  if (player) {
    player.score = score;
    return player;
  }
  return null;
};

const setPlayerReadyStatus = (socketId, isReady) => {
  console.log('stateManager: setPlayerReadyStatus called for:', socketId, 'with isReady:', isReady);
  const player = players.find(p => p.socketId === socketId);
  if (player && player.role !== 'admin') { // Host is always ready, cannot change status
    player.isReady = isReady;
    console.log(`stateManager: Player ${player.name} (${socketId}) ready status set to ${isReady}.`);
    return true;
  }
  console.log(`stateManager: Player ${socketId} not found or is admin. Ready status not changed.`);
  return false;
};

const areAllPlayersReady = () => {
  // All players (excluding host) must be ready
  return players.every(p => p.role === 'admin' || p.isReady);
};

// --- Gestión del Estado de la Sala ---

const getRoomState = () => roomState;

const startGame = () => {
  roomState.isPlaying = true;
  roomState.gameStartTime = Date.now();
  return roomState;
};

const resetGame = () => {
  roomState.isPlaying = false;
  roomState.gameStartTime = null;
  // Reset all players' ready status, except for the host
  players.forEach(p => {
    p.score = 0;
    if (p.role !== 'admin') {
      p.isReady = false;
    } else {
      p.isReady = true; // Host is always ready
    }
  });
  return roomState;
};

const clearPlayers = () => {
  players = [];
  resetGame(); // También resetea el estado de la partida
};

const makeHost = (currentHostSocketId, targetPlayerSocketId) => {
  console.log('stateManager: makeHost called. currentHostSocketId:', currentHostSocketId, 'targetPlayerSocketId:', targetPlayerSocketId);
  console.log('stateManager: current players before makeHost:', players.map(p => ({ name: p.name, socketId: p.socketId, role: p.role })));
  const currentHost = players.find(p => p.socketId === currentHostSocketId);
  const targetPlayer = players.find(p => p.socketId === targetPlayerSocketId);

  if (currentHost && targetPlayer && currentHost.role === 'admin') {
    currentHost.role = 'player';
    currentHost.isReady = false; // Old host is no longer ready
    targetPlayer.role = 'admin';
    targetPlayer.isReady = true; // New host is always ready
    console.log('stateManager: host changed. current players after makeHost:', players.map(p => ({ name: p.name, socketId: p.socketId, role: p.role })));
    return true;
  }
  console.log('stateManager: failed to make host.');
  return false;
};

const findPlayerByToken = (token) => players.find(p => p.token === token);

const removePlayerByToken = (token) => {
  const index = players.findIndex(p => p.token === token);
  if (index !== -1) {
    const removedPlayer = players.splice(index, 1)[0];
    if (removedPlayer.role === 'admin' && players.length > 0) {
      const newAdmin = players.find(p => !p.disconnected);
      if (newAdmin) {
        newAdmin.role = 'admin';
        newAdmin.isReady = true;
      }
    }
    return removedPlayer;
  }
  return null;
};

module.exports = {
  // Jugadores
  addPlayer,
  disconnectPlayerBySocketId,
  removePlayerBySocketId,
  removePlayerByToken,
  getPlayers,
  findPlayerByName,
  findPlayerByToken,
  updatePlayerScore,
  clearPlayers,
  makeHost,
  setPlayerReadyStatus,
  areAllPlayersReady,
  // Sala
  getRoomState,
  startGame,
  resetGame,
};
