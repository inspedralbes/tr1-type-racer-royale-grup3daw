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
  addPlayerToRoom(roomId, hostPlayer.name, hostPlayer.socketId, hostPlayer.token, true);
  return newRoom;
};

const getRoom = (roomId) => rooms[roomId];

const getPublicRooms = () => {
  return Object.values(rooms).filter(room => room.isPublic);
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

  return { room };
};

// --- Gestión de Jugadores Registrados ---

const addRegisteredPlayer = (name, socketId, token) => {
  const newPlayer = {
    name,
    socketId,
    token,
    currentPage: 'room-selection', // Default page after login
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

// --- Gestión de Jugadores (adaptada a salas) ---

const addPlayerToRoom = (roomId, name, socketId, token, isHost = false) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }

  // Check if player with this token already exists in the room
  const existingPlayer = room.players.find(p => p.token === token);
  if (existingPlayer) {
    existingPlayer.socketId = socketId; // Update socketId
    existingPlayer.disconnected = false; // Mark as not disconnected
    return { player: existingPlayer, room };
  }

  const newPlayer = {
    name,
    score: 0,
    role: isHost ? 'admin' : 'player',
    socketId,
    isReady: isHost, // El host siempre está listo
    token,
    disconnected: false,
  };

  room.players.push(newPlayer);
  return { player: newPlayer, room };
};

const areAllPlayersReady = (roomId) => {
  const room = getRoom(roomId);
  if (!room) {
    console.log(`areAllPlayersReady: Room ${roomId} not found.`);
    return false;
  }
  console.log(`areAllPlayersReady: Room ${roomId}, players:`, room.players.map(p => ({ name: p.name, isReady: p.isReady, role: p.role })));
  const allReady = room.players.every(p => p.isReady);
  console.log(`areAllPlayersReady: All players ready: ${allReady}`);
  return allReady;
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

  // If the removed player was the admin, assign a new admin
  if (removedPlayer.role === 'admin') {
    if (room.players.length > 0) {
      // Assign the next player as admin
      room.players[0].role = 'admin';
      room.players[0].isReady = true;
    } else {
      // No players left, delete the room
      delete rooms[roomId];
      return { roomDeleted: true };
    }
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
  if (rooms[roomId]) {
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

const resetReadyStatusInRoom = (roomId) => {
  const room = getRoom(roomId);
  if (!room) {
    return { error: 'La sala no existe.' };
  }

  room.players.forEach(p => {
    if (p.role !== 'admin') {
      p.isReady = false;
    } else {
      p.isReady = true; // Host is always ready
    }
  });

  return { room };
};


module.exports = {
  createRoom,
  getRoom,
  getPublicRooms,
  updateRoom,
  addPlayerToRoom,
  areAllPlayersReady,
  startGame,
  removePlayerFromRoom,
  makeHostInRoom,
  deleteRoom,
  setPlayerReadyStatusInRoom,
  resetReadyStatusInRoom,
  // Exportar funciones de jugadores registrados
  addRegisteredPlayer,
  findRegisteredPlayerByToken,
  updateRegisteredPlayerSocketId,
  removeRegisteredPlayer,
  registeredPlayers, // Export registeredPlayers
};
