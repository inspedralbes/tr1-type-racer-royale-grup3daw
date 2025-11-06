/**
 * Fichero: scoresController.js
 * Descripción: Este controlador maneja las solicitudes relacionadas con las puntuaciones
 * de los jugadores. Actualmente, contiene la lógica para actualizar la puntuación de un
 * jugador durante una partida.
 */
const stateManager = require('../state/stateManager');
const Score = require('../db/models/score'); // Mongoose Score model
const db = require('../db/models'); // Sequelize models (for User)

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

/**
 * POST /api/scores/save
 * Guarda la puntuación final de un jugador en la base de datos MongoDB.
 * El cuerpo de la solicitud debe contener el nombre del jugador, su puntuación y las WPM.
 */
exports.saveScore = async (req, res) => {
  const { playerName, score, wpm } = req.body;

  if (!playerName || score === undefined || wpm === undefined) {
    return res.status(400).json({ error: 'Se requieren los campos "playerName", "score" y "wpm".' });
  }

  try {
    // Buscar el email del jugador en la base de datos MySQL (Sequelize)
    const user = await db.User.findOne({ where: { username: playerName } });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos de usuarios.' });
    }

    const playerEmail = user.email;

    // Crear y guardar la nueva puntuación en MongoDB
    const newScore = new Score({
      playerName,
      playerEmail,
      score,
      wpm,
    });

    await newScore.save();

    res.status(201).json({ message: 'Puntuación guardada correctamente en MongoDB.', score: newScore });
  } catch (error) {
    console.error('Error al guardar la puntuación en MongoDB:', error);
    res.status(500).json({ error: 'Error interno del servidor al guardar la puntuación.' });
  }
};