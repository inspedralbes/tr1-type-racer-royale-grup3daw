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
    // No longer fetching email from MySQL, playerEmail will be null or an empty string
    const playerEmail = null; // Or an empty string if preferred

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

/**
 * GET /api/scores/history/:playerName
 * Recupera el historial de puntuaciones (WPM) de un jugador específico.
 */
exports.getScoreHistory = async (req, res) => {
  const { playerName } = req.params;

  if (!playerName) {
    return res.status(400).json({ error: 'Se requiere el campo "playerName".' });
  }

  try {
    const scores = await Score.find({ playerName })
      .sort({ date: -1 }) // Ordena por fecha de creación descendente para obtener los últimos
      .limit(10) // Limita a los 10 más recientes
      .select('wpm date'); // Selecciona solo los campos necesarios

    // Invertir el array para que el gráfico muestre del más antiguo al más nuevo
    res.status(200).json(scores.reverse());
  } catch (error) {
    console.error('Error al recuperar el historial de puntuaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor al recuperar el historial.' });
  }
};