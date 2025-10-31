const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomsController');

router.get('/', roomsController.getPublicRooms); // Obtiene todas las salas públicas
router.post('/', roomsController.createRoom); // Crea una nueva sala

router.get('/:roomId', roomsController.getRoomDetails); // Obtiene los detalles de una sala
router.put('/:roomId', roomsController.updateRoom); // Actualiza una sala (para el host)

router.post('/:roomId/join', roomsController.joinRoom); // Unirse a una sala
router.post('/:roomId/start', roomsController.startGame); // Inicia la partida en una sala

router.delete('/:roomId/player/:socketId', roomsController.removePlayer); // Elimina un jugador de la sala
router.post('/:roomId/make-host', roomsController.makeHost); // Hace a otro jugador el host
router.post('/:roomId/reset-ready-status', roomsController.resetReadyStatus); // Resetea el estado de listo de los jugadores

module.exports = router;
