/**
 * Fichero: roomsController.js
 * Descripción: Este fichero contiene los controladores para las rutas relacionadas con la
 * gestión de salas (`/api/rooms`). Cada función exportada maneja una solicitud HTTP específica
 * (GET, POST, PUT, DELETE) para realizar operaciones como crear, obtener, actualizar,
 * e iniciar partidas en las salas, así como gestionar a los jugadores dentro de ellas.
 * Utiliza `stateManager` para modificar el estado del servidor y las funciones de broadcast
 * (configuradas en `socketManager`) para notificar a los clientes de los cambios.
 */
const stateManager = require('../state/stateManager');

// GET /api/rooms - Devuelve la lista de todas las salas marcadas como públicas.
exports.getPublicRooms = (req, res) => {
  const publicRooms = stateManager.getPublicRooms();
  res.status(200).json(publicRooms);
};

// POST /api/rooms - Crea una nueva sala con la configuración proporcionada.
exports.createRoom = (req, res) => {
  const { hostPlayer, name, isPublic, gameMode, time } = req.body;
  if (!hostPlayer || !name) {
    return res.status(400).json({ message: 'Faltan datos para crear la sala.' });
  }
  // Llama al stateManager para crear la sala en el estado del servidor.
  const newRoom = stateManager.createRoom(hostPlayer, name, isPublic, gameMode, time);

  // Notifica a todos los clientes que la lista de salas públicas ha cambiado.
  const broadcastPublicRoomList = req.app.get('broadcastPublicRoomList');
  broadcastPublicRoomList(); // Broadcast public room list after creation

  res.status(201).json(newRoom);
};

// GET /api/rooms/:roomId - Devuelve los detalles completos de una sala específica.
exports.getRoomDetails = (req, res) => {
  const { roomId } = req.params;
  const room = stateManager.getRoom(roomId);
  if (room) {
    res.status(200).json(room);
  } else {
    res.status(404).json({ message: 'Sala no encontrada.' });
  }
};

// PUT /api/rooms/:roomId - Actualiza la configuración de una sala (acción solo para el host).
exports.updateRoom = (req, res) => {
  const { roomId } = req.params;
  const settings = req.body;

  // Guarda una copia del estado anterior para detectar cambios (ej. visibilidad).
  const oldRoom = { ...stateManager.getRoom(roomId) };

  // Actualiza la sala en el stateManager.
  const result = stateManager.updateRoom(roomId, settings);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  // Si la actualización fue exitosa, notifica a los clientes de la sala.
  if (result.room) {
    const broadcastRoomState = req.app.get('broadcastRoomState');
    broadcastRoomState(roomId);
    const broadcastPlayerList = req.app.get('broadcastPlayerList');
    broadcastPlayerList(roomId);
  
    // Si la visibilidad de la sala cambió, notifica a todos los clientes.
    if (oldRoom && oldRoom.isPublic !== result.room.isPublic) {
      const broadcastPublicRoomList = req.app.get('broadcastPublicRoomList');
      broadcastPublicRoomList();
    }
  }

  res.status(200).json(result.room);
};


// POST /api/rooms/:roomId/start - Inicia la partida en una sala (acción solo para el host).
exports.startGame = (req, res) => {
  const { roomId } = req.params;

  // Verifica si todos los jugadores en la sala están listos.
  if (!stateManager.areAllPlayersReady(roomId)) {
    return res.status(403).json({ message: 'No todos los jugadores están listos.' });
  }

  const result = stateManager.startGame(roomId);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  // Notifica a los clientes de la sala que el juego ha comenzado.
  const broadcastRoomState = req.app.get('broadcastRoomState');
  broadcastRoomState(roomId);
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  broadcastPlayerList(roomId);

  res.status(200).json(result.room);
};

// DELETE /api/rooms/:roomId/player/:socketId - Elimina a un jugador de la sala (acción solo para el host).
exports.removePlayer = (req, res) => {
  const { roomId, socketId } = req.params;

  const result = stateManager.removePlayerFromRoom(roomId, socketId);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  // Si la sala quedó vacía y fue eliminada, actualiza la lista de salas públicas.
  if (result.roomDeleted) {
    const broadcastPublicRoomList = req.app.get('broadcastPublicRoomList');
    broadcastPublicRoomList();
  } else {
    const broadcastPlayerList = req.app.get('broadcastPlayerList');
    broadcastPlayerList(roomId);
  }

  // Notifica al jugador específico que ha sido expulsado.
  const io = req.app.get('io');
  io.to(socketId).emit('player-removed');

  // Elimina al jugador del registro global de jugadores.
  stateManager.removeRegisteredPlayerBySocketId(socketId);

  res.status(200).json({ message: `Jugador con socketId ${socketId} eliminado.` });
};

// POST /api/rooms/:roomId/make-host - Transfiere el rol de host a otro jugador (acción solo para el host actual).
exports.makeHost = (req, res) => {
  const { roomId } = req.params;
  const { targetPlayerSocketId } = req.body;

  const room = stateManager.getRoom(roomId);
  if (!room) {
    return res.status(404).json({ message: 'Sala no encontrada.' });
  }

  // Identifica al host actual a través de su token de autorización.
  const token = req.headers.authorization;
  const currentHost = room.players.find(p => p.token === token);

  const result = stateManager.makeHostInRoom(roomId, currentHost.socketId, targetPlayerSocketId);

  if (result.error) {
    return res.status(400).json({ message: result.error });
  }

  // Notifica a los clientes de la sala sobre el cambio de host.
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  broadcastPlayerList(roomId);

  res.status(200).json({ message: `Jugador con socketId ${targetPlayerSocketId} es ahora el host.` });
};

// POST /api/rooms/:roomId/reset-ready-status - Resetea el estado "listo" de todos los jugadores (ej. después de una partida).
exports.resetReadyStatus = (req, res) => {
  const { roomId } = req.params;

  const result = stateManager.resetReadyStatusInRoom(roomId);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  // Notifica a los clientes de la sala que el estado de "listo" ha sido reseteado.
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  broadcastPlayerList(roomId);

  res.status(200).json({ message: 'Estado de listo de jugadores reseteado.' });
};
