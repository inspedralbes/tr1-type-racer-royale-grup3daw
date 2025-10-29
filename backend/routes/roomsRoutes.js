const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/roomsController');

router.delete('/', roomsController.deleteRoom); // Resetea la sala

module.exports = router;