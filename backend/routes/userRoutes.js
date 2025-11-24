const express = require('express');
const router = express.Router();
const { register, getProfile, updateProfile, deleteAccount } = require('../controllers/userController');

router.post('/register', register);

// Get current user profile
router.get('/me', getProfile);

// Update current user profile
router.put('/me', updateProfile);

// Delete current user account
router.delete('/me', deleteAccount);

module.exports = router;
