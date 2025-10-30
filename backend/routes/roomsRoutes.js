const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomsController');

router.get('/', roomsController.getPlayersInRoom); // Obtiene los jugadores de la sala
router.delete('/', roomsController.deleteRoom); // Resetea la sala
router.post('/start', roomsController.startGame); // Inicia la partida
router.delete('/player/:socketId', roomsController.removePlayer); // Elimina un jugador de la sala
router.post('/make-host', roomsController.makeHost); // Hace a otro jugador el host
router.post('/reset-ready-status', roomsController.resetReadyStatus); // Resetea el estado de listo de los jugadores

module.exports = router;