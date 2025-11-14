/**
 * Fichero: roomsRoutes.js
 * Descripción: Define las rutas de la API REST para la gestión de salas de juego.
 * Este fichero utiliza el router de Express para asociar las rutas (endpoints) con
 * sus respectivos controladores (`roomsController`). También aplica middleware de
 * autenticación (`verifyHost`) a las rutas que requieren que el solicitante sea
 * el anfitrión (host) de la sala.
 */
const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomsController');
const { verifyHost } = require('../middleware/auth');

// --- Rutas Públicas y de Creación ---
router.get('/', roomsController.getPublicRooms); // GET /api/rooms: Obtiene la lista de todas las salas públicas.
router.post('/', roomsController.createRoom);     // POST /api/rooms: Crea una nueva sala.

// --- Rutas Específicas de una Sala ---
router.get('/:roomId', roomsController.getRoomDetails); // GET /api/rooms/:roomId: Obtiene los detalles de una sala específica.
router.put('/:roomId', verifyHost, roomsController.updateRoom); // PUT /api/rooms/:roomId: Actualiza la configuración de una sala (solo host).

// --- Rutas de Acciones dentro de una Sala (protegidas por `verifyHost`) ---
router.post('/:roomId/start', verifyHost, roomsController.startGame); // POST /api/rooms/:roomId/start: Inicia la partida en la sala.

router.delete('/:roomId/player/:socketId', verifyHost, roomsController.removePlayer); // DELETE /api/rooms/:roomId/player/:socketId: Expulsa a un jugador.
router.post('/:roomId/make-host', verifyHost, roomsController.makeHost); // POST /api/rooms/:roomId/make-host: Transfiere el rol de host.
router.post('/:roomId/reset-ready-status', verifyHost, roomsController.resetReadyStatus); // POST /api/rooms/:roomId/reset-ready-status: Resetea el estado "listo" de los jugadores.

// Exporta el router para ser usado en la aplicación principal de Express.
module.exports = router;
