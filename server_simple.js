require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3002;
const cloudConvertKey = process.env.CLOUDCONVERT_KEY;

// Диагностика переменных окружения при запуске
console.log('🔍 Simple Server Environment Check:');
console.log(`Port: ${port}`);
console.log(`CLOUDCONVERT_KEY: ${cloudConvertKey ? 'SET ✅' : 'MISSING ❌'}`);

if (!cloudConvertKey) {
  console.error('🚨 CRITICAL: CLOUDCONVERT_KEY environment variable is not set!');
}

app.use(cors({ origin: true }));
app.use(express.static('public'));

// Настройка multer для загрузки файлов
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 400 * 1024 * 1024 // 400MB
  }
});

app.post('/api/start-conversion', upload.single('file'), async (req, res) => {
  console.log('🔄 Received conversion request (simple server)');
  
  try {
    if (!cloudConvertKey) {
      return res.status(500).json({ 
        error: 'Server configuration error: CLOUDCONVERT_KEY not set' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const outputFormat = req.body.outputformat;
    if (!outputFormat) {
      return res.status(400).json({ error: 'Output format not specified' });
    }

    console.log(`📄 File received: ${req.file.originalname}, Size: ${req.file.size} bytes`);
    console.log(`🔄 Converting to: ${outputFormat}`);

    // Читаем загруженный файл
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64File = fileBuffer.toString('base64');

    console.log('🔄 Creating CloudConvert job...');

    // Создаем CloudConvert job
    const response = await axios.post('https://api.cloudconvert.com/v2/jobs', {
      tasks: {
        'import-file': {
          operation: 'import/base64',
          file: base64File,
          filename: req.file.originalname
        },
        'convert-file': {
          operation: 'convert',
          input: 'import-file',
          output_format: outputFormat
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

    const jobId = response.data.data.id;
    console.log(`✅ CloudConvert job created: ${jobId}`);

    // Удаляем временный файл
    fs.unlinkSync(req.file.path);

    res.json({ id: jobId });

  } catch (error) {
    console.error('🚨 Error in conversion:', error.message);
    
    // Удаляем временный файл в случае ошибки
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: error.response ? error.response.data.message : error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'simple',
    environment: {
      port: port,
      cloudConvertKey: cloudConvertKey ? 'SET ✅' : 'MISSING ❌'
    }
  });
});

// CloudConvert status endpoint
app.get('/api/conversion-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await axios.get(`https://api.cloudconvert.com/v2/jobs/${id}`, {
      headers: {
        'Authorization': `Bearer ${cloudConvertKey}`
      }
    });
    
    const jobData = response.data.data;
    console.log(`📊 Job status: ${jobData.status} (${id})`);
    
    let status = jobData.status;
    let downloadUrl = null;
    let step = 'wait';
    let fileSize = null;
    
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
      step = 'convert';
    } else if (status === 'waiting') {
      step = 'wait';
    }
    
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
    console.error('Error fetching job status:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversion status' });
  }
});

// Catch all для SPA
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Создаем папку для загрузок если не существует
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.listen(port, () => {
  console.log(`🚀 Simple Convertio Server running on http://localhost:${port}`);
  console.log(`📁 Static files served from ./public`);
  console.log(`📤 File uploads saved to ./uploads`);
});