
const { User } = require('../db/models');

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

    const newUser = await User.create({ id, username, email, password, avatar, color });

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

module.exports = { register };
