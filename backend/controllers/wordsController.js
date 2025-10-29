const fs = require('fs');
const path = require('path');

const wordsFilePath = path.join(__dirname, '..', 'words.json');

exports.getWords = (req, res) => {
  fs.readFile(wordsFilePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'No se pudo leer el archivo de palabras.' });
    }
    res.status(200).json(JSON.parse(data));
  });
};