const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomsController');

router.get('/', roomsController.getPlayersInRoom); // Obtiene los jugadores de la sala
router.delete('/', roomsController.deleteRoom); // Resetea la sala
router.post('/start', roomsController.startGame); // Inicia la partida

module.exports = router;