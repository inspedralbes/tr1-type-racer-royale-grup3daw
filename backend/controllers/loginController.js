/**
 * @file loginController.js
 * @description Controlador para manejar la lógica de inicio de sesión y registro de jugadores.
 * Este módulo se encarga de la autenticación inicial de los jugadores, la gestión de tokens
 * y la reconexión de jugadores existentes.
 */

// Importa el módulo 'crypto' para generar tokens seguros.
const crypto = require('crypto');
// Importa el gestor de estado para interactuar con los datos de los jugadores y las salas.
const stateManager = require('../state/stateManager');

/**
 * @function handleLogin
 * @description Maneja las solicitudes de inicio de sesión de los jugadores.
 * Verifica si un jugador intenta reconectarse con un token existente o si es un nuevo inicio de sesión.
 * Asigna un token a los nuevos jugadores y gestiona los conflictos de nombres.
 * @param {Object} req - Objeto de solicitud de Express. Espera 'name', 'socketId' y opcionalmente 'token' en el cuerpo.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Object} - Retorna un objeto JSON con los datos del jugador o un mensaje de error.
 */
exports.handleLogin = (req, res) => {
  const { name, socketId, token } = req.body;

  // Valida que los campos 'name' y 'socketId' estén presentes en la solicitud.
  if (!name || !socketId) {
    return res.status(400).json({ error: 'Los campos "name" y "socketId" son requeridos.' });
  }

  // Si se proporciona un token, el jugador está intentando reconectarse.
  if (token) {
    // Busca al jugador registrado usando el token proporcionado.
    const player = stateManager.findRegisteredPlayerByToken(token);
    if (player) {
      // Si el jugador es encontrado, actualiza su socketId (ya que pudo haber cambiado).
      stateManager.updateRegisteredPlayerSocketId(token, socketId);
      // El roomId ya está en el objeto del jugador registrado.
      
      // Retorna los datos del jugador, incluyendo la página actual y el ID de la sala si está en una.
      return res.status(200).json({ ...player, currentPage: player.currentPage, roomId: player.roomId || null });
    } else {
      // Si el token existe pero el jugador no se encuentra (ej. el servidor se reinició y los datos se perdieron).
      // Intenta registrar al jugador nuevamente con el token existente y los datos proporcionados.
      // Primero, verifica si el nombre ya está en uso por otro jugador activo.
      const existingPlayerByName = Object.values(stateManager.registeredPlayers).find(p => p.name === name);
      if (existingPlayerByName) {
        // Si el nombre está en uso por otro jugador, retorna un conflicto.
        return res.status(409).json({ error: `El nombre "${name}" ya está en uso por otro jugador.` });
      }
      // Si el nombre no está en uso, re-registra al jugador con el token antiguo.
      const reRegisteredPlayer = stateManager.addRegisteredPlayer(name, socketId, token);
      return res.status(200).json(reRegisteredPlayer);
    }
  }
  // Si no hay token, o el token era inválido y no se pudo re-registrar, procede como un nuevo inicio de sesión.
  // Verifica si el nombre ya está en uso por un jugador actualmente registrado.
  const existingPlayer = Object.values(stateManager.registeredPlayers).find(p => p.name === name);
  if (existingPlayer) {
    // Si el nombre ya está en uso, retorna un conflicto.
    return res.status(409).json({ error: `El nombre "${name}" ya está en uso.` });
  }

  // Genera un nuevo token seguro para el nuevo jugador.
  const newPlayerToken = crypto.randomBytes(16).toString('hex');
  // Añade el nuevo jugador al gestor de estado.
  const newPlayer = stateManager.addRegisteredPlayer(name, socketId, newPlayerToken);

  // Retorna los datos del nuevo jugador con un estado 201 (Creado).
  res.status(201).json(newPlayer);
};