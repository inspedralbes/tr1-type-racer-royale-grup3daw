const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoUri;
    if (process.env.NODE_ENV === 'production') {
      mongoUri = process.env.MONGO_URI;
      console.log('Connecting to production MongoDB...');
    } else {
      mongoUri = 'mongodb://mongo:27017/typeracer';
      console.log('Connecting to development MongoDB...');
    }
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;