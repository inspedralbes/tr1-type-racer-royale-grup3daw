
const { User } = require('../db/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');




exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      verified: true,
    });

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ userId: user.id }, 'your-secret-key', { expiresIn: '1h' });

    stateManager.addRegisteredPlayer(user.username, null, token);

    res.status(200).json({ token, username: user.username, email: user.email });
  } catch (error) {
    next(error);
  }
};

exports.loginAsGuest = async (req, res, next) => {
  try {
    const { username } = req.body;
    const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });

    stateManager.addRegisteredPlayer(username, null, token);

    res.status(200).json({ token, username, email: null });
  } catch (error) {
    next(error);
  }
};

