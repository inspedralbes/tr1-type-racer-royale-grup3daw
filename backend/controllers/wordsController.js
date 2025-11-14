const https = require('https');

function fetchRandomWords(count) {
  return new Promise((resolve, reject) => {
    const url = `https://random-word-api.vercel.app/api?words=${count}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

exports.getWords = async (req, res) => {
  try {
    const allWords = await fetchRandomWords(200);

    const facil = allWords.filter(word => word.length >= 3 && word.length <= 5).slice(0, 30);
    const normal = allWords.filter(word => word.length >= 6 && word.length <= 8).slice(0, 30);
    const dificil = allWords.filter(word => word.length >= 9 && word.length <= 12).slice(0, 30);

    const words = {
      facil,
      normal,
      dificil
    };

    res.status(200).json(words);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo obtener las palabras de la API.' });
  }
};