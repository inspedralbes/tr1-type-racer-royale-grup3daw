// Este módulo simula una base de datos en memoria para el estado de la aplicación.

let players = []; // Almacena { name: string, score: number, role: 'player' | 'admin', socketId: string }
let roomState = { isPlaying: false };

// --- Gestión de Jugadores ---

const addPlayer = (name, socketId) => {
  const newPlayer = {
    name,
    score: 0,
    role: players.length === 0 ? 'admin' : 'player',
    socketId,
  };
  players.push(newPlayer);
  return newPlayer;
};

const removePlayerBySocketId = (socketId) => {
  const index = players.findIndex(p => p.socketId === socketId);
  if (index !== -1) {
    const removedPlayer = players.splice(index, 1)[0];
    if (removedPlayer.role === 'admin' && players.length > 0) {
      players[0].role = 'admin';
    }
  }
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

// --- Gestión del Estado de la Sala ---

const getRoomState = () => roomState;

const startGame = () => {
  roomState.isPlaying = true;
  return roomState;
};

const resetGame = () => {
  roomState.isPlaying = false;
  return roomState;
};

const clearPlayers = () => {
  players = [];
  resetGame(); // También resetea el estado de la partida
};

module.exports = {
  // Jugadores
  addPlayer,
  removePlayerBySocketId,
  getPlayers,
  findPlayerByName,
  updatePlayerScore,
  clearPlayers,
  // Sala
  getRoomState,
  startGame,
  resetGame,
};
