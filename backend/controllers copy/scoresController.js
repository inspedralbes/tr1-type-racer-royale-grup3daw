const stateManager = require('../state/stateManager');

// POST /api/scores - Actualiza la puntuación de un jugador
exports.updateScore = (req, res) => {
  const { name, score } = req.body;
  const broadcastPlayerList = req.app.get('broadcastPlayerList');

  if (!name || score === undefined) {
    return res.status(400).json({ error: 'Se requieren los campos "name" y "score".' });
  }

  // Usamos la función importada para actualizar el estado en roomsController
  const updatedPlayer = stateManager.updatePlayerScore(name, score);

  if (!updatedPlayer) {
    return res.status(404).json({ error: 'Jugador no encontrado.' });
  }

  // Notificamos a todos los clientes la nueva lista de jugadores
  broadcastPlayerList();

  res.status(200).json({ message: 'Puntuación actualizada correctamente.' });
};