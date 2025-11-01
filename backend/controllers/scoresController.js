/**
 * Fichero: scoresController.js
 * Descripción: Este controlador maneja las solicitudes relacionadas con las puntuaciones
 * de los jugadores. Actualmente, contiene la lógica para actualizar la puntuación de un
 * jugador durante una partida.
 */
const stateManager = require('../state/stateManager');

/**
 * POST /api/scores
 * Actualiza la puntuación de un jugador en una sala específica.
 * El cuerpo de la solicitud debe contener el nombre del jugador, su nueva puntuación y el ID de la sala.
 * Tras la actualización, notifica a todos los jugadores de la sala con la lista de jugadores actualizada.
 */
exports.updateScore = (req, res) => {
  const { name, score, roomId } = req.body;
  const broadcastPlayerList = req.app.get('broadcastPlayerList');

  // Valida que los datos necesarios estén presentes en la solicitud.
  if (!name || score === undefined || !roomId) {
    return res.status(400).json({ error: 'Se requieren los campos "name", "score" y "roomId".' });
  }

  // Utiliza el stateManager para actualizar la puntuación del jugador en el estado del servidor.
  const updatedPlayer = stateManager.updatePlayerScore(roomId, name, score);

  if (!updatedPlayer) {
    return res.status(404).json({ error: 'Jugador no encontrado.' });
  }

  // Emite un evento a todos los clientes en la sala con la lista de jugadores actualizada.
  broadcastPlayerList(roomId);

  res.status(200).json({ message: 'Puntuación actualizada correctamente.' });
};