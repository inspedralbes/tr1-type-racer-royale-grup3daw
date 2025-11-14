
const { User } = require('../db/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const stateManager = require('../state/stateManager');




exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    console.log('Registering user:', { username, email });

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log('User with email already exists:', email);
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    console.log('Hashing password for user:', username);
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Creating user in database:', { username, email });
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      verified: true,
    });
    console.log('User created successfully:', user.id);

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    console.error('Error during registration:', error);
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

    // Mark this registered player as a guest so other server logic can skip DB lookups
    stateManager.addRegisteredPlayer(username, null, token, 'room-selection', true);

    res.status(200).json({ token, username, email: null });
  } catch (error) {
    next(error);
  }
};

