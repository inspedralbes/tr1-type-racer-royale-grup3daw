const stateManager = require('../state/stateManager');

exports.handleLogin = (req, res) => {
  const { name, socketId } = req.body;
  const broadcastPlayerList = req.app.get('broadcastPlayerList');

  if (!name || !socketId) {
    return res.status(400).json({ error: 'Los campos "name" y "socketId" son requeridos.' });
  }

  // Añadimos el jugador junto con su socketId al estado
  const newPlayer = stateManager.addPlayer(name, socketId);

  // Notificamos a todos los clientes la nueva lista de jugadores
  broadcastPlayerList();

  // Devolvemos los datos del nuevo jugador en la respuesta HTTP
  res.status(200).json(newPlayer);
};