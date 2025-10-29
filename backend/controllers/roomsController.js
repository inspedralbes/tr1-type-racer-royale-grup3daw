const stateManager = require('../state/stateManager');

// --- Controladores de Rutas HTTP ---

// DELETE /api/rooms - Vacía la sala
exports.deleteRoom = (req, res) => {
  const broadcastPlayerList = req.app.get('broadcastPlayerList');
  stateManager.clearPlayers();
  // Notificamos a los clientes que la sala se ha vaciado
  broadcastPlayerList();
  res.status(200).json({ message: 'La sala ha sido vaciada.' });
};