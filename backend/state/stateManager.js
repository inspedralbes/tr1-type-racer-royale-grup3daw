// Este módulo simula una base de datos en memoria para el estado de la aplicación.

const rooms = {}; // Almacena las salas, la clave es el ID de la sala.
const registeredPlayers = {}; // Almacena jugadores registrados pero no en una sala

// --- Gestión de Salas ---

const generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Asegurarse de que el ID no exista ya
  if (rooms[result]) {
    return generateRoomId();
  }
  return result;
};

const createRoom = (hostPlayer, name, isPublic, gameMode, time) => {
  const roomId = generateRoomId();
  const newRoom = {
    id: roomId,
    name,
    isPublic,
    gameMode,
    time,
    players: [],
    isPlaying: false,
    gameStartTime: null,
  };

  rooms[roomId] = newRoom;
  // Construimos el objeto hostPlayer para pasarlo a addPlayerToRoom
  addPlayerToRoom(roomId, hostPlayer, true);
  return newRoom;
};

const getRoom = (roomId) => rooms[roomId];

const getPublicRooms = () => {
  return Object.values(rooms).filter(room => room.isPublic);
};

const getRooms = () => {
  return rooms;
};

const updateRoom = (roomId, settings) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }

  if (settings.name) {
    room.name = settings.name;
  }
  if (settings.isPublic !== undefined) {
    room.isPublic = settings.isPublic;
  }
  if (settings.gameMode) {
    room.gameMode = settings.gameMode;
  }
  if (settings.time) {
    room.time = settings.time;
  }
  if (settings.eliminatedPlayers !== undefined) {
    room.eliminatedPlayers = settings.eliminatedPlayers;
  }

  return { room };
};

// --- Gestión de Jugadores Registrados ---

const addRegisteredPlayer = (name, socketId, token, currentPage = 'room-selection', isGuest = false) => {
  const newPlayer = {
    name,
    socketId,
    token,
    currentPage, // Use provided currentPage or default
    isGuest: !!isGuest,
  };
  registeredPlayers[token] = newPlayer;
  return newPlayer;
};

const findRegisteredPlayerByToken = (token) => {
  return registeredPlayers[token];
};

const updateRegisteredPlayerSocketId = (token, newSocketId) => {
  const player = registeredPlayers[token];
  if (player) {
    player.socketId = newSocketId;
  }
  return player;
};

const removeRegisteredPlayer = (token) => {
  const player = registeredPlayers[token];
  if (player) {
    delete registeredPlayers[token];
  }
  return player;
};

const removeRegisteredPlayerBySocketId = (socketId) => {
  if (!socketId) return null;

  // Find the token of the player with the given socketId
  const token = Object.keys(registeredPlayers).find(
    (key) => registeredPlayers[key].socketId === socketId
  );

  if (token) {
    return removeRegisteredPlayer(token);
  }
  return null;
};
// --- Gestión de Jugadores (adaptada a salas) ---

const addPlayerToRoom = (roomId, player, isHost = false) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }
  const { name, socketId, token } = player;

  // Check if player with this token already exists in the room
  const existingPlayer = room.players.find(p => p.token === token);
  if (existingPlayer) {
    existingPlayer.socketId = socketId; // Update socketId
    existingPlayer.disconnected = false; // Mark as not disconnected
    return { player: existingPlayer, room };
  }

  if (room.isPlaying) {
    return { error: 'La partida ya ha comenzado.' };
  }

  // Actualizar el jugador registrado con el roomId
  const registeredPlayer = findRegisteredPlayerByToken(token);
  if (registeredPlayer) {
    registeredPlayer.roomId = roomId;
  }

  const newPlayer = {
    name,
    score: 0,
    role: isHost ? 'admin' : 'player', // El rol se asigna aquí
    socketId,
    isReady: isHost, // El host siempre está listo
    token,
    disconnected: false,
  };

  room.players.push(newPlayer);
  return { room };
};

const areAllPlayersReady = (roomId) => {
  const room = getRoom(roomId);
  if (!room) {
    return false;
  }
  return room.players.every(p => p.isReady && !p.disconnected);
};

const startGame = (roomId) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }

  room.isPlaying = true;
  room.gameStartTime = Date.now();
  room.players.forEach(p => {
    p.score = 0;
    // Reset gameData for all players when a new game starts
    p.gameData = {
      time: 10, // Default time for Muerte Subita, will be overwritten if not Muerte Subita
      streak: 0,
      isEliminated: false
    };
  });

  return { room };
};

const removePlayerFromRoom = (roomId, playerSocketId) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }

  const index = room.players.findIndex(p => p.socketId === playerSocketId);
  if (index === -1) {
    return { error: 'Jugador no encontrado en la sala.' };
  }

  const removedPlayer = room.players.splice(index, 1)[0];

  // Limpiar el roomId del jugador registrado
  const registeredPlayer = findRegisteredPlayerByToken(removedPlayer.token);
  if (registeredPlayer) {
    delete registeredPlayer.roomId;
  }

  if (room.players.length === 0) {
    delete rooms[roomId];
    return { roomDeleted: true };
  }

  // If the removed player was the admin, assign a new admin
  if (removedPlayer.role === 'admin') {
    // The room is not empty, so there's at least one player to be the new admin
    room.players[0].role = 'admin';
    room.players[0].isReady = true;
  }

  return { room };
};

const removePlayerFromRoomByToken = (roomId, token) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }

  const index = room.players.findIndex(p => p.token === token);
  if (index === -1) {
    return { error: 'Jugador no encontrado en la sala.' };
  }

  const removedPlayer = room.players.splice(index, 1)[0];

  if (room.players.length === 0) {
    delete rooms[roomId];
    return { roomDeleted: true };
  }

  // If the removed player was the admin, assign a new admin
  if (removedPlayer.role === 'admin' && room.players.length > 0) {
    room.players[0].role = 'admin';
    room.players[0].isReady = true;
  }

  return { room };
};

const makeHostInRoom = (roomId, currentHostSocketId, targetPlayerSocketId) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }

  const currentHost = room.players.find(p => p.socketId === currentHostSocketId);
  const targetPlayer = room.players.find(p => p.socketId === targetPlayerSocketId);

  if (!currentHost || currentHost.role !== 'admin') {
    return { error: 'Solo el host actual puede transferir el rol de host.' };
  }
  if (!targetPlayer) {
    return { error: 'Jugador objetivo no encontrado.' };
  }

  currentHost.role = 'player';
  currentHost.isReady = false;
  targetPlayer.role = 'admin';
  targetPlayer.isReady = true;

  return { room };
};

const deleteRoom = (roomId) => {
  const room = rooms[roomId];
  if (room) {
    // Clear any registeredPlayers' roomId references for players that were in this room
    room.players.forEach(p => {
      if (p && p.token && registeredPlayers[p.token]) {
        try {
          delete registeredPlayers[p.token].roomId;
        } catch (e) {
          // ignore
        }
      }
    });

    delete rooms[roomId];
    return { success: true };
  }
  return { error: 'Sala no encontrada.' };
};

const setPlayerReadyStatusInRoom = (roomId, playerSocketId, isReady) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }

  const player = room.players.find(p => p.socketId === playerSocketId);
  if (!player) {
    return { error: 'Jugador no encontrado en la sala.' };
  }

  if (player.role !== 'admin') { // Host is always ready, cannot change status
    player.isReady = isReady;
  }

  return { room };
};

const setPlayerDisconnected = (roomId, token, isDisconnected) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }

  const player = room.players.find(p => p.token === token);
  if (!player) {
    return { error: 'Jugador no encontrado en la sala.' };
  }

  player.disconnected = isDisconnected;

  return { player, room };
};

const resetReadyStatusInRoom = (roomId) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }

  room.isPlaying = false;
  room.gameStartTime = null;

  room.players.forEach(p => {
    if (p.role !== 'admin') {
      p.isReady = false;
    } else {
      p.isReady = true; // Host is always ready
    }
  });

  return { room };
};


const updatePlayerScore = (roomId, playerName, newScore) => {
  const room = getRoom(roomId);
  if (!room) {
    return null;
  }

  const player = room.players.find(p => p.name === playerName);
  if (!player) {
    return null;
  }

  player.score = newScore;
  return player;
};

const findPlayerInRoomByName = (roomId, playerName) => {
  const room = getRoom(roomId);
  if (!room) {
    return null;
  }
  return room.players.find(p => p.name === playerName);
};

const eliminatePlayerInRoom = (roomId, playerName) => {
  const room = getRoom(roomId);
  if (room && !room.eliminatedPlayers.includes(playerName)) {
    room.eliminatedPlayers.push(playerName);
  }
};

module.exports = {
  createRoom,
  getRoom,
  getPublicRooms,
  getRooms, // Exportar la nueva función
  updateRoom,
  addPlayerToRoom,
  areAllPlayersReady,
  startGame,
  removePlayerFromRoom,
  removePlayerFromRoomByToken,
  makeHostInRoom,
  deleteRoom,
  setPlayerReadyStatusInRoom,
  resetReadyStatusInRoom,
  setPlayerDisconnected,
  updatePlayerScore, // Exportar la nueva función
  // Exportar funciones de jugadores registrados
  addRegisteredPlayer,
  findRegisteredPlayerByToken,
  updateRegisteredPlayerSocketId,
  removeRegisteredPlayer,
  removeRegisteredPlayerBySocketId, // Exportar la nueva función
  registeredPlayers, // Export registeredPlayers
  findPlayerInRoomByName,
  eliminatePlayerInRoom,
};
