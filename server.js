require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Busboy = require('busboy');
const os = require('os');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const convertioKey = process.env.CONVERTIO_KEY;

app.use(cors({ origin: true }));
app.use(express.static('public'));

app.post('/api/start-conversion', (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const busboy = Busboy({ headers: req.headers });
  const tmpdir = os.tmpdir();
  const fields = {};
  const fileWrites = [];

  busboy.on('field', (fieldname, val) => {
    fields[fieldname] = val;
  });

  busboy.on('file', (fieldname, file, { filename }) => {
    const filepath = path.join(tmpdir, filename);
    const writeStream = fs.createWriteStream(filepath);
    file.pipe(writeStream);

    const promise = new Promise((resolve, reject) => {
      file.on('end', () => {
        writeStream.end();
      });
      writeStream.on('finish', () => {
        resolve({ filepath, filename });
      });
      writeStream.on('error', reject);
    });
    fileWrites.push(promise);
  });

  const conversionPromise = new Promise((resolve, reject) => {
    busboy.on('finish', async () => {
      try {
        const files = await Promise.all(fileWrites);
        const [uploadedFile] = files;

        if (!uploadedFile) {
          return reject(new Error('File is required'));
        }

        let fileBuffer;
        try {
          const fileStats = fs.statSync(uploadedFile.filepath);
          const fileSizeInMB = fileStats.size / (1024 * 1024);
          
          // Проверяем размер файла (максимум 100MB для бесплатного аккаунта)
          if (fileSizeInMB > 100) {
            throw new Error('File size exceeds 100MB limit');
          }
          
          fileBuffer = fs.readFileSync(uploadedFile.filepath);
        } finally {
          // Всегда удаляем временный файл
          if (fs.existsSync(uploadedFile.filepath)) {
            fs.unlinkSync(uploadedFile.filepath);
          }
        }

        const response = await axios.post('https://api.convertio.co/convert', {
          apikey: convertioKey,
          input: 'base64',
          file: fileBuffer.toString('base64'),
          filename: uploadedFile.filename,
          outputformat: fields.outputformat,
        });

        // Проверяем статус ответа от Convertio API
        if (response.data.status !== 'ok') {
          throw new Error(response.data.error || 'Convertio API returned an error');
        }

        resolve(response.data.data);
      } catch (error) {
        reject(error);
      }
    });

    busboy.on('error', (err) => reject(err));
  });

  req.pipe(busboy);

  conversionPromise
    .then((data) => res.json({ id: data.id }))
    .catch((error) => {
      console.error('Error during conversion process:', error.message);
      res.status(500).json({ error: 'Failed to process file upload.' });
    });
});

app.get('/api/conversion-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`https://api.convertio.co/convert/${id}/status`);
    
    // Проверяем статус ответа от Convertio API
    if (response.data.status !== 'ok') {
      return res.status(400).json({ error: response.data.error || 'Convertio API returned an error' });
    }
    
    res.json(response.data.data);
  } catch (error) {
    console.error('Error fetching conversion status:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch conversion status' });
  }
});

// Обработчик для всех остальных GET-запросов, возвращает index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});