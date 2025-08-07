require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Busboy = require('busboy');
const os = require('os');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3012;
const convertioKey = process.env.CONVERTIO_KEY;

app.use(cors({ origin: true }));
app.use(express.static('public'));

// Middleware для получения реального IP адреса
app.set('trust proxy', true);

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
        let shouldUseDirectUpload = false; // Объявляем переменную заранее
        
        try {
          const fileStats = fs.statSync(uploadedFile.filepath);
          const fileSizeInMB = fileStats.size / (1024 * 1024);
          
          // Получаем IP адрес клиента
          const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                          (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                          req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
          
          // Ваш IP адрес (замените на ваш реальный IP)
          const allowedIP = '127.0.0.1'; // или ваш внешний IP
          const isLocalhost = clientIP === '::1' || clientIP === '127.0.0.1' || clientIP === '::ffff:127.0.0.1';
          
          // Проверяем размер файла для Render Free (максимум 400MB общий лимит)
          const maxBase64Size = 200; // 200MB максимум для base64 (экономим RAM)
          const maxDirectUploadSize = 400; // 400MB максимум для Render Free Plan
          
          if (fileSizeInMB > maxDirectUploadSize) {
            throw new Error(`File size exceeds ${maxDirectUploadSize}MB limit`);
          }
          
          shouldUseDirectUpload = fileSizeInMB > maxBase64Size;
          
          // Логируем информацию для отладки
          console.log(`File upload: ${fileSizeInMB.toFixed(2)}MB from IP: ${clientIP}, isLocalhost: ${isLocalhost}, useDirectUpload: ${shouldUseDirectUpload}`);
          
          if (!shouldUseDirectUpload) {
            // Для файлов меньше 300MB используем base64
            fileBuffer = fs.readFileSync(uploadedFile.filepath);
          }
        } finally {
          // Удаляем временный файл только для base64 загрузки
          if (!shouldUseDirectUpload && fs.existsSync(uploadedFile.filepath)) {
            fs.unlinkSync(uploadedFile.filepath);
          }
        }

        let response;
        let conversionId;

        if (shouldUseDirectUpload) {
          // Для больших файлов используем direct upload
          console.log('Using direct upload for large file...');
          
          // Шаг 1: Создаем задачу конвертации с input: "upload"
          response = await axios.post('https://api.convertio.co/convert', {
            apikey: convertioKey,
            input: 'upload',
            filename: uploadedFile.filename,
            outputformat: fields.outputformat,
          });

          if (response.data.status !== 'ok') {
            throw new Error(response.data.error || 'Failed to create conversion task');
          }

          conversionId = response.data.data.id;
          
          // Шаг 2: Загружаем файл через PUT запрос
          console.log(`Uploading file for conversion ID: ${conversionId}`);
          
          const fileStream = fs.createReadStream(uploadedFile.filepath);
          const uploadResponse = await axios.put(
            `https://api.convertio.co/convert/${conversionId}/${encodeURIComponent(uploadedFile.filename)}`,
            fileStream,
            {
              headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': fs.statSync(uploadedFile.filepath).size
              },
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              timeout: 1800000 // 30 минут таймаут для больших файлов
            }
          );

          // Удаляем временный файл после загрузки
          if (fs.existsSync(uploadedFile.filepath)) {
            fs.unlinkSync(uploadedFile.filepath);
          }

          if (uploadResponse.data.status !== 'ok') {
            throw new Error(uploadResponse.data.error || 'Failed to upload file');
          }

          console.log('File uploaded successfully via direct upload');
          
        } else {
          // Для файлов меньше 300MB используем base64
          response = await axios.post('https://api.convertio.co/convert', {
            apikey: convertioKey,
            input: 'base64',
            file: fileBuffer.toString('base64'),
            filename: uploadedFile.filename,
            outputformat: fields.outputformat,
          });

          if (response.data.status !== 'ok') {
            throw new Error(response.data.error || 'Convertio API returned an error');
          }

          conversionId = response.data.data.id;
        }

        // Возвращаем ID конвертации
        resolve({ id: conversionId });
      } catch (error) {
        console.error('Detailed error in conversion process:', {
          message: error.message,
          stack: error.stack,
          response: error.response ? error.response.data : 'No response data'
        });
        reject(error);
      }
    });

    busboy.on('error', (err) => reject(err));
  });

  req.pipe(busboy);

  conversionPromise
    .then((data) => res.json({ id: data.id }))
    .catch((error) => {
      console.error('Error during conversion process:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        response: error.response ? error.response.data : 'No response'
      });
      
      // Более информативные ошибки для клиента
      if (error.message.includes('File size exceeds')) {
        return res.status(413).json({ error: error.message });
      }
      if (error.message.includes('API')) {
        return res.status(422).json({ error: error.message });
      }
      
      res.status(500).json({ error: `Failed to process file upload: ${error.message}` });
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
  console.log(`🚀 Convertio Server is running on http://localhost:${port}`);
  console.log(`📁 Static files served from ./public`);
  console.log(`🔄 Auto-restart enabled with nodemon`);
});