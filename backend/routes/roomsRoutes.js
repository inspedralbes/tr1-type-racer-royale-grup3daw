const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomsController');
const { verifyHost } = require('../middleware/auth');

router.get('/', roomsController.getPublicRooms); // Obtiene todas las salas públicas
router.post('/', roomsController.createRoom); // Crea una nueva sala

router.get('/:roomId', roomsController.getRoomDetails); // Obtiene los detalles de una sala
router.put('/:roomId', verifyHost, roomsController.updateRoom); // Actualiza una sala (para el host)


router.post('/:roomId/start', verifyHost, roomsController.startGame); // Inicia la partida en una sala

router.delete('/:roomId/player/:socketId', verifyHost, roomsController.removePlayer); // Elimina un jugador de la sala
router.post('/:roomId/make-host', verifyHost, roomsController.makeHost); // Hace a otro jugador el host
router.post('/:roomId/reset-ready-status', verifyHost, roomsController.resetReadyStatus); // Resetea el estado de listo de los jugadores

module.exports = router;
