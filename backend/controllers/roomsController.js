const stateManager = require('../state/stateManager');

// GET /api/rooms - Devuelve la lista de salas públicas
exports.getPublicRooms = (req, res) => {
  const publicRooms = stateManager.getPublicRooms();
  res.status(200).json(publicRooms);
};

// POST /api/rooms - Crea una nueva sala
exports.createRoom = (req, res) => {
  const { hostPlayer, name, isPublic, gameMode, time } = req.body;
  if (!hostPlayer || !name) {
    return res.status(400).json({ message: 'Faltan datos para crear la sala.' });
  }
  const newRoom = stateManager.createRoom(hostPlayer, name, isPublic, gameMode, time);

  const broadcastPublicRoomList = req.app.get('broadcastPublicRoomList');
  broadcastPublicRoomList(); // Broadcast public room list after creation

  res.status(201).json(newRoom);
};

// GET /api/rooms/:roomId - Devuelve los detalles de una sala
exports.getRoomDetails = (req, res) => {
  const { roomId } = req.params;
  const room = stateManager.getRoom(roomId);
  if (room) {
    res.status(200).json(room);
  } else {
    res.status(404).json({ message: 'Sala no encontrada.' });
  }
};

// PUT /api/rooms/:roomId - Actualiza una sala (para el host)
exports.updateRoom = (req, res) => {
  const { roomId } = req.params;
  const settings = req.body;

  const oldRoom = { ...stateManager.getRoom(roomId) }; // Get a copy of old room state

  const result = stateManager.updateRoom(roomId, settings);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  if (result.room) {
    const broadcastRoomState = req.app.get('broadcastRoomState');
    broadcastRoomState(roomId);
    const broadcastPlayerList = req.app.get('broadcastPlayerList');
    broadcastPlayerList(roomId);
  
    // If isPublic status changed, broadcast public room list
    if (oldRoom && oldRoom.isPublic !== result.room.isPublic) {
      const broadcastPublicRoomList = req.app.get('broadcastPublicRoomList');
      broadcastPublicRoomList();
    }
  }

  res.status(200).json(result.room);
};


// POST /api/rooms/:roomId/start - Inicia la partida en una sala
exports.startGame = (req, res) => {
  const { roomId } = req.params;

  if (!stateManager.areAllPlayersReady(roomId)) {
    return res.status(403).json({ message: 'No todos los jugadores están listos.' });
  }

  const result = stateManager.startGame(roomId);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  const broadcastRoomState = req.app.get('broadcastRoomState');
  broadcastRoomState(roomId);
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  broadcastPlayerList(roomId);

  res.status(200).json(result.room);
};

// DELETE /api/rooms/:roomId/player/:socketId - Elimina un jugador de la sala
exports.removePlayer = (req, res) => {
  const { roomId, socketId } = req.params;

  const result = stateManager.removePlayerFromRoom(roomId, socketId);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  if (result.roomDeleted) {
    const broadcastPublicRoomList = req.app.get('broadcastPublicRoomList');
    broadcastPublicRoomList();
  } else {
    const broadcastPlayerList = req.app.get('broadcastPlayerList');
    broadcastPlayerList(roomId);
  }

  // Notificar al jugador eliminado que ha sido expulsado
  const io = req.app.get('io');
  io.to(socketId).emit('player-removed');

  // Eliminar al jugador de la lista de jugadores registrados
  stateManager.removeRegisteredPlayerBySocketId(socketId);

  res.status(200).json({ message: `Jugador con socketId ${socketId} eliminado.` });
};

// POST /api/rooms/:roomId/make-host - Hace a otro jugador el host
exports.makeHost = (req, res) => {
  const { roomId } = req.params;
  const { targetPlayerSocketId } = req.body;

  const room = stateManager.getRoom(roomId);
  if (!room) {
    return res.status(404).json({ message: 'Sala no encontrada.' });
  }

  const token = req.headers.authorization;
  const currentHost = room.players.find(p => p.token === token);

  const result = stateManager.makeHostInRoom(roomId, currentHost.socketId, targetPlayerSocketId);

  if (result.error) {
    return res.status(400).json({ message: result.error });
  }

  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  broadcastPlayerList(roomId);

  res.status(200).json({ message: `Jugador con socketId ${targetPlayerSocketId} es ahora el host.` });
};

// POST /api/rooms/:roomId/reset-ready-status - Resetea el estado de listo de los jugadores
exports.resetReadyStatus = (req, res) => {
  const { roomId } = req.params;

  const result = stateManager.resetReadyStatusInRoom(roomId);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  broadcastPlayerList(roomId);

  res.status(200).json({ message: 'Estado de listo de jugadores reseteado.' });
};
