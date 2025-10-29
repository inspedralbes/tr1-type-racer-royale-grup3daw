const stateManager = require('../state/stateManager');

exports.handleLogin = (req, res) => {
  const { name } = req.body;
  const broadcastPlayerList = req.app.get('broadcastPlayerList');

  if (!name) {
    return res.status(400).json({ error: 'El campo "name" es requerido.' });
  }

  // 1. Le pedimos al roomsController que cree y añada el jugador a su estado local.
  // La lógica de crear 'score' y 'role' está dentro de addPlayer.
  const newPlayer = stateManager.addPlayer(name);

  // Notificamos a todos los clientes la nueva lista de jugadores
  broadcastPlayerList();

  // Devolvemos los datos del nuevo jugador en la respuesta HTTP
  res.status(200).json(newPlayer);
};