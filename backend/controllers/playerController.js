/**
 * @file playerController.js
 * @description Controlador para manejar la lógica relacionada con los jugadores, como la actualización de su página actual.
 */

// Importa el gestor de estado para interactuar con los datos de los jugadores.
const stateManager = require('../state/stateManager');

/**
 * @function updatePlayerPage
 * @description Actualiza la página actual en la que se encuentra un jugador.
 * Esto es útil para rastrear la navegación del jugador dentro de la aplicación.
 * @param {Object} req - Objeto de solicitud de Express. Espera 'token' y 'page' en el cuerpo.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} - Retorna un mensaje de éxito o un mensaje de error si el jugador no es encontrado o faltan parámetros.
 */
exports.updatePlayerPage = (req, res) => {
  const { token, page } = req.body;

  // Valida que los campos 'token' y 'page' estén presentes en la solicitud.
  if (!token || !page) {
    return res.status(400).json({ error: 'Token and page are required.' });
  }

  // Busca al jugador registrado usando el token proporcionado.
  const player = stateManager.findRegisteredPlayerByToken(token);

  // Si el jugador es encontrado, actualiza su propiedad 'currentPage'.
  if (player) {
    player.currentPage = page;
    res.status(200).json({ message: 'Page updated.' });
  } else {
    // Si el jugador no es encontrado, retorna un error 404.
    res.status(404).json({ error: 'Player not found.' });
  }
};
