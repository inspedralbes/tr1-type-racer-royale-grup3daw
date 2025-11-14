
const { User } = require('../db/models');
const bcrypt = require('bcrypt');
const stateManager = require('../state/stateManager');

const register = async (req, res) => {
  const { id, username, email, password, avatar, color } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await User.create({ id, username, email, password: hashed, avatar, color });

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// Get current user profile (authenticated via token in Authorization header)
const getProfile = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const reg = stateManager.findRegisteredPlayerByToken(token);
    if (!reg || !reg.name) return res.status(404).json({ message: 'User not found' });

    // Si el jugador es un invitado, no buscamos en la base de datos.
    // Devolvemos un perfil "invitado" con email nulo.
    if (reg.isGuest) {
      return res.json({
        id: reg.id, // Asegurarse de que el ID del jugador invitado se incluya
        username: reg.name,
        email: null,
        avatar: reg.avatar || null, // Asumiendo que los invitados pueden tener avatar/color
        color: reg.color || null,
      });
    }

    const user = await User.findOne({ where: { username: reg.name } });
    if (!user) return res.status(404).json({ message: 'User not found in DB' });

    // Do not send password
    const { id, username, email, avatar, color } = user;
    res.json({ id, username, email, avatar, color });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// Update current user
const updateProfile = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const reg = stateManager.findRegisteredPlayerByToken(token);
    if (!reg || !reg.name) return res.status(404).json({ message: 'User not found' });

    const user = await User.findOne({ where: { username: reg.name } });
    if (!user) return res.status(404).json({ message: 'User not found in DB' });

    const { username, password, avatar, color } = req.body;

    if (username) user.username = username;
    if (avatar !== undefined) user.avatar = avatar;
    if (color !== undefined) user.color = color;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      user.password = hashed;
    }

    await user.save();

    // Update stateManager registered player name if changed
    if (username && reg.token) {
      const rp = stateManager.findRegisteredPlayerByToken(reg.token);
      if (rp) rp.name = username;
      // Also update any room player entries
      const rooms = stateManager.getRooms();
      Object.values(rooms).forEach(room => {
        room.players.forEach(p => {
          if (p.token === reg.token) {
            p.name = username;
          }
        });
      });
    }

    res.json({ message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// Delete current user
const deleteAccount = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const reg = stateManager.findRegisteredPlayerByToken(token);
    if (!reg || !reg.name) return res.status(404).json({ message: 'User not found' });

    const user = await User.findOne({ where: { username: reg.name } });
    if (!user) return res.status(404).json({ message: 'User not found in DB' });

    await user.destroy();

    // Remove from stateManager and rooms
    stateManager.removeRegisteredPlayer(token);
    // Also remove player from any rooms by token
    const rooms = stateManager.getRooms();
    Object.values(rooms).forEach(room => {
      const idx = room.players.findIndex(p => p.token === token);
      if (idx !== -1) {
        room.players.splice(idx, 1);
      }
    });

    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

module.exports = { register, getProfile, updateProfile, deleteAccount };
