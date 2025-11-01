/**
 * @file roomsController.js
 * @description Este controlador maneja las operaciones relacionadas con las salas de juego.
 * Incluye la creación, obtención, actualización y gestión de jugadores dentro de las salas,
 * así como el inicio de partidas. Utiliza `stateManager` para la gestión del estado
 * y `socketManager` (a través de `req.app.get`) para la comunicación en tiempo real con los clientes.
 */

// Importa el gestor de estado para interactuar con los datos de las salas y los jugadores.
const stateManager = require('../state/stateManager');

/**
 * @function getPublicRooms
 * @description Obtiene y devuelve una lista de todas las salas que están marcadas como públicas.
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} - Retorna un array de objetos de sala pública.
 * @route GET /api/rooms
 */
exports.getPublicRooms = (req, res) => {
  const publicRooms = stateManager.getPublicRooms();
  res.status(200).json(publicRooms);
};

/**
 * @function createRoom
 * @description Crea una nueva sala de juego con la configuración proporcionada.
 * El jugador que crea la sala se convierte automáticamente en el host.
 * @param {Object} req - Objeto de solicitud de Express. Espera 'hostPlayer', 'name', 'isPublic', 'gameMode' y 'time' en el cuerpo.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} - Retorna el objeto de la sala recién creada o un mensaje de error si faltan datos.
 * @route POST /api/rooms
 */
exports.createRoom = (req, res) => {
  const { hostPlayer, name, isPublic, gameMode, time } = req.body;
  // Valida que los datos esenciales para crear la sala estén presentes.
  if (!hostPlayer || !name) {
    return res.status(400).json({ message: 'Faltan datos para crear la sala.' });
  }
  // Llama al stateManager para crear la sala en el estado del servidor.
  const newRoom = stateManager.createRoom(hostPlayer, name, isPublic, gameMode, time);

  // Notifica a todos los clientes que la lista de salas públicas ha cambiado.
  const broadcastPublicRoomList = req.app.get('broadcastPublicRoomList');
  broadcastPublicRoomList();

  res.status(201).json(newRoom);
};

/**
 * @function getRoomDetails
 * @description Obtiene y devuelve los detalles completos de una sala específica por su ID.
 * @param {Object} req - Objeto de solicitud de Express. Espera 'roomId' en los parámetros de la ruta.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} - Retorna el objeto de la sala o un mensaje de error si la sala no es encontrada.
 * @route GET /api/rooms/:roomId
 */
exports.getRoomDetails = (req, res) => {
  const { roomId } = req.params;
  const room = stateManager.getRoom(roomId);
  if (room) {
    res.status(200).json(room);
  } else {
    res.status(404).json({ message: 'Sala no encontrada.' });
  }
};

/**
 * @function updateRoom
 * @description Actualiza la configuración de una sala existente. Solo el host de la sala puede realizar esta acción.
 * @param {Object} req - Objeto de solicitud de Express. Espera 'roomId' en los parámetros de la ruta y la configuración de la sala en el cuerpo.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} - Retorna el objeto de la sala actualizada o un mensaje de error.
 * @route PUT /api/rooms/:roomId
 */
exports.updateRoom = (req, res) => {
  const { roomId } = req.params;
  const settings = req.body;

  // Guarda una copia del estado anterior de la sala para detectar cambios (ej. visibilidad).
  const oldRoom = { ...stateManager.getRoom(roomId) };

  // Actualiza la sala en el stateManager con la nueva configuración.
  const result = stateManager.updateRoom(roomId, settings);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  // Si la actualización fue exitosa, notifica a los clientes de la sala sobre los cambios.
  if (result.room) {
    const broadcastRoomState = req.app.get('broadcastRoomState');
    broadcastRoomState(roomId);
    const broadcastPlayerList = req.app.get('broadcastPlayerList');
    broadcastPlayerList(roomId);
  
    // Si la visibilidad de la sala cambió (de pública a privada o viceversa), notifica a todos los clientes.
    if (oldRoom && oldRoom.isPublic !== result.room.isPublic) {
      const broadcastPublicRoomList = req.app.get('broadcastPublicRoomList');
      broadcastPublicRoomList();
    }
  }

  res.status(200).json(result.room);
};

/**
 * @function startGame
 * @description Inicia la partida en una sala específica. Solo el host de la sala puede realizar esta acción.
 * Requiere que todos los jugadores estén en estado 'listo'.
 * @param {Object} req - Objeto de solicitud de Express. Espera 'roomId' en los parámetros de la ruta.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} - Retorna el objeto de la sala con el estado de juego actualizado o un mensaje de error.
 * @route POST /api/rooms/:roomId/start
 */
exports.startGame = (req, res) => {
  const { roomId } = req.params;

  // Verifica si todos los jugadores en la sala están listos para iniciar la partida.
  if (!stateManager.areAllPlayersReady(roomId)) {
    return res.status(403).json({ message: 'No todos los jugadores están listos.' });
  }

  // Inicia la partida a través del stateManager.
  const result = stateManager.startGame(roomId);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  // Notifica a los clientes de la sala que el juego ha comenzado y actualiza la lista de jugadores.
  const broadcastRoomState = req.app.get('broadcastRoomState');
  broadcastRoomState(roomId);
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  broadcastPlayerList(roomId);

  res.status(200).json(result.room);
};

/**
 * @function removePlayer
 * @description Elimina a un jugador de una sala específica. Esta acción puede ser realizada por el host.
 * Si la sala queda vacía después de la eliminación, la sala es eliminada.
 * @param {Object} req - Objeto de solicitud de Express. Espera 'roomId' y 'socketId' en los parámetros de la ruta.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} - Retorna un mensaje de éxito o un mensaje de error.
 * @route DELETE /api/rooms/:roomId/player/:socketId
 */
exports.removePlayer = (req, res) => {
  const { roomId, socketId } = req.params;

  // Elimina al jugador de la sala a través del stateManager.
  const result = stateManager.removePlayerFromRoom(roomId, socketId);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  // Si la sala quedó vacía y fue eliminada, actualiza la lista de salas públicas para todos los clientes.
  if (result.roomDeleted) {
    const broadcastPublicRoomList = req.app.get('broadcastPublicRoomList');
    broadcastPublicRoomList();
  } else {
    // Si la sala no fue eliminada, solo actualiza la lista de jugadores para los clientes de esa sala.
    const broadcastPlayerList = req.app.get('broadcastPlayerList');
    broadcastPlayerList(roomId);
  }

  // Notifica al jugador específico que ha sido expulsado de la sala.
  const io = req.app.get('io');
  io.to(socketId).emit('player-removed');

  // Elimina al jugador del registro global de jugadores.
  stateManager.removeRegisteredPlayerBySocketId(socketId);

  res.status(200).json({ message: `Jugador con socketId ${socketId} eliminado.` });
};

/**
 * @function makeHost
 * @description Transfiere el rol de host de una sala a otro jugador. Solo el host actual puede realizar esta acción.
 * @param {Object} req - Objeto de solicitud de Express. Espera 'roomId' en los parámetros de la ruta y 'targetPlayerSocketId' en el cuerpo.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} - Retorna un mensaje de éxito o un mensaje de error.
 * @route POST /api/rooms/:roomId/make-host
 */
exports.makeHost = (req, res) => {
  const { roomId } = req.params;
  const { targetPlayerSocketId } = req.body;

  const room = stateManager.getRoom(roomId);
  if (!room) {
    return res.status(404).json({ message: 'Sala no encontrada.' });
  }

  // Identifica al host actual utilizando el token de autorización de la solicitud.
  const token = req.headers.authorization;
  const currentHost = room.players.find(p => p.token === token);

  // Transfiere el rol de host a través del stateManager.
  const result = stateManager.makeHostInRoom(roomId, currentHost.socketId, targetPlayerSocketId);

  if (result.error) {
    return res.status(400).json({ message: result.error });
  }

  // Notifica a los clientes de la sala sobre el cambio de host actualizando la lista de jugadores.
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  broadcastPlayerList(roomId);

  res.status(200).json({ message: `Jugador con socketId ${targetPlayerSocketId} es ahora el host.` });
};

/**
 * @function resetReadyStatus
 * @description Resetea el estado 'listo' de todos los jugadores en una sala. Esto es útil después de que una partida termina.
 * @param {Object} req - Objeto de solicitud de Express. Espera 'roomId' en los parámetros de la ruta.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} - Retorna un mensaje de éxito o un mensaje de error.
 * @route POST /api/rooms/:roomId/reset-ready-status
 */
exports.resetReadyStatus = (req, res) => {
  const { roomId } = req.params;

  // Resetea el estado 'listo' de los jugadores en la sala a través del stateManager.
  const result = stateManager.resetReadyStatusInRoom(roomId);

  if (result.error) {
    return res.status(404).json({ message: result.error });
  }

  // Notifica a los clientes de la sala que el estado de 'listo' ha sido reseteado.
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  broadcastPlayerList(roomId);

  res.status(200).json({ message: 'Estado de listo de jugadores reseteado.' });
};
