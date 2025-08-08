require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Busboy = require('busboy');
const os = require('os');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3002;
const cloudConvertKey = process.env.CLOUDCONVERT_KEY;

// Диагностика переменных окружения при запуске
console.log('🔍 Environment Check:');
console.log(`Port: ${port}`);
console.log(`CLOUDCONVERT_KEY: ${cloudConvertKey ? 'SET ✅' : 'MISSING ❌'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

if (!cloudConvertKey) {
  console.error('🚨 CRITICAL: CLOUDCONVERT_KEY environment variable is not set!');
  console.error('   Please set CLOUDCONVERT_KEY in Render Dashboard Environment Variables');
}

app.use(cors({ origin: true }));
app.use(express.static('public'));

// Увеличиваем лимиты для больших файлов
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware для получения реального IP адреса
app.set('trust proxy', true);

app.post('/api/start-conversion', (req, res) => {
  console.log('🔄 Received conversion request');
  
  // Дополнительная проверка CLOUDCONVERT_KEY на каждый запрос
  if (!cloudConvertKey) {
    console.error('🚨 CLOUDCONVERT_KEY missing in request handler');
    return res.status(500).json({ 
      error: 'Server configuration error: CLOUDCONVERT_KEY not set. Please check Render Environment Variables.' 
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Установим таймауты для предотвращения висящих соединений
  req.setTimeout(120000); // 2 минуты
  res.setTimeout(120000);

  // Обработка неожиданных отключений
  req.on('close', () => {
    console.log('⚠️ Client disconnected during upload');
  });

  try {
    const busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 400 * 1024 * 1024, // 400MB
        files: 1,
        fieldSize: 10 * 1024 * 1024, // 10MB для полей
        parts: 10 // максимум 10 частей
      },
      defCharset: 'utf8'
    });
    
    const tmpdir = os.tmpdir();
    const fields = {};
    const fileWrites = [];
    
    console.log('📝 Busboy initialized successfully');

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
            // Для файлов меньше 200MB используем base64
            fileBuffer = fs.readFileSync(uploadedFile.filepath);
          }
        } catch (fileError) {
          console.error('Error reading file:', fileError);
          throw new Error(`File reading error: ${fileError.message}`);
        }

        let response;
        let jobId;

        // CloudConvert работает через Jobs с множественными задачами
        console.log(`🔄 Starting CloudConvert job for ${uploadedFile.filename} → ${fields.outputformat}`);
        
        if (shouldUseDirectUpload) {
          // Для больших файлов используем upload задачу
          console.log('Using CloudConvert upload task for large file...');
          
          response = await axios.post('https://api.cloudconvert.com/v2/jobs', {
            tasks: {
              'upload-file': {
                operation: 'import/upload'
              },
              'convert-file': {
                operation: 'convert',
                input: 'upload-file',
                output_format: fields.outputformat
              },
              'export-file': {
                operation: 'export/url',
                input: 'convert-file'
              }
            }
          }, {
            headers: {
              'Authorization': `Bearer ${cloudConvertKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.status !== 200) {
            throw new Error('Failed to create CloudConvert job');
          }

          jobId = response.data.data.id;
          const uploadTask = response.data.data.tasks.find(task => task.name === 'upload-file');
          
          // Загружаем файл на CloudConvert
          console.log(`📤 Uploading file to CloudConvert...`);
          const fileStream = fs.createReadStream(uploadedFile.filepath);
          
          const uploadResponse = await axios.post(uploadTask.result.form.url, {
            ...uploadTask.result.form.parameters,
            file: fileStream
          }, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 1800000 // 30 минут
          });

          // Удаляем временный файл
          if (fs.existsSync(uploadedFile.filepath)) {
            fs.unlinkSync(uploadedFile.filepath);
          }
          
        } else {
          // Для файлов меньше 200MB используем base64
          console.log('Using CloudConvert base64 import for small file...');
          
          response = await axios.post('https://api.cloudconvert.com/v2/jobs', {
            tasks: {
              'import-file': {
                operation: 'import/base64',
                file: fileBuffer.toString('base64'),
                filename: uploadedFile.filename
              },
              'convert-file': {
                operation: 'convert',
                input: 'import-file',
                output_format: fields.outputformat
              },
              'export-file': {
                operation: 'export/url',
                input: 'convert-file'
              }
            }
          }, {
            headers: {
              'Authorization': `Bearer ${cloudConvertKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.status !== 200) {
            throw new Error('Failed to create CloudConvert job');
          }

          jobId = response.data.data.id;
        }

        // Удаляем временный файл после успешного создания job
        if (fs.existsSync(uploadedFile.filepath)) {
          fs.unlinkSync(uploadedFile.filepath);
          console.log(`🗑️ Temporary file deleted: ${uploadedFile.filepath}`);
        }
        
        // Возвращаем CloudConvert Job ID
        console.log(`✅ CloudConvert job created successfully: ${jobId}`);
        resolve({ id: jobId });
      } catch (error) {
        console.error('🚨 Detailed error in CloudConvert process:', {
          message: error.message,
          stack: error.stack,
          code: error.code,
          cloudConvertKey: cloudConvertKey ? 'SET' : 'MISSING',
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : 'No response data'
        });
        
        // Удаляем временный файл в случае ошибки
        if (uploadedFile && fs.existsSync(uploadedFile.filepath)) {
          try {
            fs.unlinkSync(uploadedFile.filepath);
            console.log(`🗑️ Temporary file deleted after error: ${uploadedFile.filepath}`);
          } catch (deleteError) {
            console.error('Error deleting temporary file:', deleteError);
          }
        }
        
        reject(error);
      }
    });

    busboy.on('error', (err) => {
    console.error('🚨 Busboy error:', err);
    reject(err);
  });

  // Обработка ошибок соединения
  req.on('error', (err) => {
    console.error('🚨 Request error:', err);
    reject(new Error('Request connection error'));
  });

  req.on('aborted', () => {
    console.error('🚨 Request aborted by client');
    reject(new Error('Request was aborted'));
  });

  req.pipe(busboy);

  conversionPromise
    .then((data) => {
      console.log('✅ Conversion started successfully:', data.id);
      res.json({ id: data.id });
    })
    .catch((error) => {
      console.error('🚨 Error during CloudConvert process:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        cloudConvertKey: cloudConvertKey ? 'SET' : 'MISSING',
        response: error.response ? error.response.data : 'No response'
      });
      
      // Более информативные ошибки для клиента
      if (error.message.includes('configuration error')) {
        return res.status(500).json({ error: error.message });
      }
      if (error.message.includes('File size exceeds')) {
        return res.status(413).json({ error: error.message });
      }
      if (error.message.includes('API')) {
        return res.status(422).json({ error: error.message });
      }
      
      res.status(500).json({ error: `Failed to process file upload: ${error.message}` });
    });
  } catch (initError) {
    console.error('🚨 Error initializing busboy:', initError);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to initialize file upload handler' });
    }
  }
});

// Глобальная обработка неперехваченных ошибок
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // НЕ выходим из процесса, продолжаем работу
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // НЕ выходим из процесса, продолжаем работу
});

// Простой тестовый endpoint для проверки загрузки файлов
app.post('/api/test-upload', (req, res) => {
  console.log('🧪 Test upload endpoint');
  
  try {
    const busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB для теста
        files: 1
      }
    });
    
    let fileReceived = false;
    
    busboy.on('file', (fieldname, file, { filename }) => {
      console.log('📁 File received:', filename);
      fileReceived = true;
      
      let fileSize = 0;
      file.on('data', (data) => {
        fileSize += data.length;
      });
      
      file.on('end', () => {
        console.log('✅ File upload complete:', fileSize, 'bytes');
      });
    });
    
    busboy.on('finish', () => {
      console.log('✅ Upload finished');
      res.json({ 
        success: true, 
        message: 'File uploaded successfully',
        fileReceived: fileReceived
      });
    });
    
    req.pipe(busboy);
    
  } catch (error) {
    console.error('🚨 Test upload error:', error);
    res.status(500).json({ error: 'Test upload failed' });
  }
});

// Health check эндпоинт для диагностики
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      port: port,
      nodeEnv: process.env.NODE_ENV || 'not set',
      cloudConvertKey: cloudConvertKey ? 'SET ✅' : 'MISSING ❌'
    }
  };
  
  console.log('🏥 Health check requested:', health);
  res.json(health);
});

// Тест CloudConvert API
app.get('/api/test-cloudconvert', async (req, res) => {
  console.log('🧪 Testing CloudConvert API...');
  
  if (!cloudConvertKey) {
    return res.status(500).json({ error: 'CLOUDCONVERT_KEY not set' });
  }

  try {
    // Шаг 1: Создаем job для конвертации
    const jobResponse = await axios.post('https://api.cloudconvert.com/v2/jobs', {
      tasks: {
        'import-file': {
          operation: 'import/base64',
          file: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          filename: 'test.png'
        },
        'convert-file': {
          operation: 'convert',
          input: 'import-file',
          output_format: 'jpg'
        },
        'export-file': {
          operation: 'export/url',
          input: 'convert-file'
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${cloudConvertKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ CloudConvert API test response:', jobResponse.data);
    res.json({
      success: true,
      cloudconvert_response: jobResponse.data,
      message: 'CloudConvert API working!'
    });
  } catch (error) {
    console.error('🚨 CloudConvert API test failed:', {
      message: error.message,
      response: error.response ? error.response.data : 'No response'
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      cloudconvert_error: error.response ? error.response.data : null
    });
  }
});

// Простой тест точно как curl
app.get('/api/test-curl-like', async (req, res) => {
  console.log('🧪 Testing Convertio API exactly like curl...');
  
  if (!convertioKey) {
    return res.status(500).json({ error: 'CONVERTIO_KEY not set' });
  }

  try {
    const response = await fetch('https://api.convertio.co/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify({
        "apikey": convertioKey,
        "input": "base64", 
        "file": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "filename": "test.png",
        "outputformat": "jpg"
      })
    });

    const data = await response.json();
    console.log('🔍 Curl-like response:', { status: response.status, data });

    res.json({
      success: response.ok,
      status: response.status,
      convertio_response: data,
      method: 'curl-like'
    });
  } catch (error) {
    console.error('🚨 Curl-like test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      method: 'curl-like'
    });
  }
});

// Простой тест Convertio API с fetch вместо axios
app.get('/api/test-convertio-fetch', async (req, res) => {
  console.log('🧪 Testing Convertio API with fetch...');
  
  if (!convertioKey) {
    return res.status(500).json({ error: 'CONVERTIO_KEY not set' });
  }

  try {
    const response = await fetch('https://api.convertio.co/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apikey: convertioKey,
        input: 'base64',
        file: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        filename: 'test.png',
        outputformat: 'jpg'
      })
    });

    const data = await response.json();
    console.log('🔍 Fetch response:', { status: response.status, data });

    res.json({
      success: response.ok,
      status: response.status,
      convertio_response: data,
      method: 'fetch'
    });
  } catch (error) {
    console.error('🚨 Fetch test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      method: 'fetch'
    });
  }
});

// Простой тест Convertio API без загрузки файла
app.get('/api/test-convertio', async (req, res) => {
  console.log('🧪 Testing Convertio API connection...');
  
  if (!convertioKey) {
    return res.status(500).json({ error: 'CONVERTIO_KEY not set' });
  }

  // Получаем внешний IP сервера
  let serverIP = 'unknown';
  try {
    const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
    serverIP = ipResponse.data.ip;
    console.log('🌐 Server external IP:', serverIP);
  } catch (ipError) {
    console.log('⚠️ Could not get external IP:', ipError.message);
  }

  try {
    // Добавляем User-Agent и другие заголовки как в браузере
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Тестовый запрос к Convertio API
    const response = await axios.post('https://api.convertio.co/convert', {
      apikey: convertioKey,
      input: 'base64',
      file: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', // Минимальный 1x1 PNG
      filename: 'test.png',
      outputformat: 'jpg',
    }, { headers });

    console.log('✅ Convertio API test response:', response.data);
    res.json({
      success: true,
      convertio_response: response.data,
      server_ip: serverIP,
      message: 'Convertio API working!'
    });
  } catch (error) {
    console.error('🚨 Convertio API test failed:', {
      message: error.message,
      response: error.response ? error.response.data : 'No response'
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      server_ip: serverIP,
      convertio_error: error.response ? error.response.data : null
    });
  }
});

app.get('/api/conversion-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // CloudConvert использует jobs вместо conversions
    const response = await axios.get(`https://api.cloudconvert.com/v2/jobs/${id}`, {
      headers: {
        'Authorization': `Bearer ${cloudConvertKey}`
      }
    });
    
    const jobData = response.data.data;
    console.log(`📊 CloudConvert job status: ${jobData.status} (${id})`);
    
    // Преобразуем CloudConvert статусы в формат, понятный фронтенду
    let status = jobData.status;
    let downloadUrl = null;
    let step = 'wait';
    let fileSize = null;
    
    // Определяем step на основе статуса задач
    if (status === 'finished') {
      const exportTask = jobData.tasks.find(task => task.operation === 'export/url');
      if (exportTask && exportTask.result && exportTask.result.files) {
        downloadUrl = exportTask.result.files[0].url;
        fileSize = exportTask.result.files[0].size;
        step = 'finish';
      }
    } else if (status === 'error') {
      const errorTask = jobData.tasks.find(task => task.status === 'error');
      if (errorTask) {
        return res.status(400).json({ error: errorTask.message || 'CloudConvert job failed' });
      }
    } else if (status === 'processing') {
      // Проверяем какая задача выполняется
      const importTask = jobData.tasks.find(task => task.operation === 'import/base64' || task.operation === 'import/upload');
      const convertTask = jobData.tasks.find(task => task.operation === 'convert');
      
      if (importTask && importTask.status === 'processing') {
        step = 'upload';
      } else if (convertTask && convertTask.status === 'processing') {
        step = 'convert';
      } else {
        step = 'wait';
      }
    } else if (status === 'waiting') {
      step = 'wait';
    }
    
    // Возвращаем в формате совместимом с фронтендом
    res.json({
      id: jobData.id,
      status: status,
      step: step,
      step_percent: status === 'finished' ? 100 : (status === 'processing' ? 50 : 10),
      output: downloadUrl ? {
        url: downloadUrl,
        size: fileSize
      } : null
    });
    
  } catch (error) {
    console.error('Error fetching CloudConvert job status:', error.response ? error.response.data : error.message);
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