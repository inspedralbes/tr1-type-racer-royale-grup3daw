// Este módulo simula una base de datos en memoria para el estado de la aplicación.

let players = []; // Almacena { name: string, score: number, role: 'player' | 'admin' }

/**
 * Añade un nuevo jugador a la lista.
 * @param {string} name - El nombre del jugador.
 * @returns {object} El objeto del nuevo jugador.
 */
const addPlayer = (name) => {
  const newPlayer = {
    name,
    score: 0,
    role: players.length === 0 ? 'admin' : 'player', // El primer jugador es admin
  };
  players.push(newPlayer);
  return newPlayer;
};

/**
 * Elimina un jugador de la lista por su nombre.
 * @param {string} name - El nombre del jugador a eliminar.
 */
const removePlayer = (name) => {
  const index = players.findIndex(p => p.name === name);
  if (index !== -1) {
    const removedPlayer = players.splice(index, 1)[0];
    // Si el admin se va, se asigna el rol al siguiente jugador más antiguo
    if (removedPlayer.role === 'admin' && players.length > 0) {
      players[0].role = 'admin';
    }
  }
};

/**
 * Devuelve la lista completa de jugadores.
 * @returns {Array<object>} La lista de jugadores.
 */
const getPlayers = () => {
  return players;
};

/**
 * Elimina todos los jugadores de la lista.
 */
const clearPlayers = () => {
  players = [];
};

/**
 * Actualiza la puntuación de un jugador.
 * @param {string} name - El nombre del jugador.
 * @param {number} score - La nueva puntuación.
 * @returns {object | null} El jugador actualizado o null si no se encuentra.
 */
const updatePlayerScore = (name, score) => {
  const player = players.find(p => p.name === name);
  if (player) {
    player.score = score;
    return player;
  }
  return null;
};

module.exports = {
  addPlayer,
  removePlayer,
  getPlayers,
  clearPlayers,
  updatePlayerScore,
};
