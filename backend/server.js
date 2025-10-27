const express = require('express');
const mongoose = require('mongoose');
const mysql = require('mysql2');

const app = express();
const port = 3000;

const nodeEnv = process.env.NODE_ENV;

// MongoDB Connection
const mongoUri = process.env.MONGO_URI;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// MySQL Connection
let db;
if (nodeEnv === 'production') {
  db = mysql.createConnection({
    host: process.env.DB_HOST_PROD,
    user: process.env.DB_USER_PROD,
    password: process.env.DB_PASSWORD_PROD,
    database: process.env.DB_NAME_PROD
  });
} else {
  db = mysql.createConnection({
    host: process.env.DB_HOST_DEV,
    user: process.env.DB_USER_DEV,
    password: process.env.DB_PASSWORD_DEV,
    database: process.env.DB_NAME_DEV
  });
}

db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('MySQL connected');
});

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.get('/data', (req, res) => {
    db.query('SELECT 1', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, results });
    });
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
