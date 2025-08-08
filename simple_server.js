require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3002;

// Render.com требует IPv4 адрес 0.0.0.0
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const cloudConvertKey = process.env.CLOUDCONVERT_KEY;

console.log('🔍 Starting Simple Server...');
console.log(`Port: ${port}`);
console.log(`Node ENV: ${process.env.NODE_ENV}`);
console.log(`All env vars:`, Object.keys(process.env).filter(key => key.includes('CLOUD')));
console.log(`CloudConvert Key: ${cloudConvertKey ? 'SET ✅' : 'MISSING ❌'}`);
console.log(`CloudConvert Key length: ${cloudConvertKey ? cloudConvertKey.length : 0}`);

app.use(cors({ origin: true }));
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));

// Настройка multer для обработки файлов
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// Health check для Render
app.get('/api/health', (req, res) => {
  // Render ожидает HTTP 200 статус для успешного health check
  const healthData = {
    status: 'ok',
    service: 'Convertio File Converter',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: {
      port: port,
      nodeEnv: process.env.NODE_ENV || 'development',
      cloudConvertKey: cloudConvertKey ? 'CONFIGURED' : 'MISSING',
      platform: process.platform,
      nodeVersion: process.version
    },
    render: {
      healthCheckPath: '/api/health',
      ready: true
    }
  };

  // Обязательно отправляем HTTP 200 для Render
  res.status(200).json(healthData);
  
  // Логируем для отладки на Render
  console.log(`🏥 Health check OK - Uptime: ${healthData.uptime}s`);
});

// Дополнительный health check endpoint (без /api/ префикса)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'convertio-ready'
  });
});

// Простая конвертация с multer
app.post('/api/start-conversion', upload.single('file'), async (req, res) => {
  console.log('🔄 Simple conversion request received');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!cloudConvertKey) {
      return res.status(500).json({ error: 'CloudConvert key not configured' });
    }
    
    const { outputformat } = req.body;
    console.log(`📁 File: ${req.file.originalname}, Size: ${req.file.size} bytes, Format: ${outputformat}`);
    
    // Конвертируем файл в base64
    const base64File = req.file.buffer.toString('base64');
    
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
          output_format: outputformat,
          options: outputformat === 'jpg' ? { quality: 90 } : {}
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
      },
      timeout: 30000
    });
    
    if (response.status === 200 || response.status === 201) {
      const jobId = response.data.data.id;
      console.log('✅ Job created:', jobId);
      res.json({ id: jobId });
    } else {
      throw new Error(`CloudConvert API error: ${response.status}`);
    }
    
  } catch (error) {
    console.error('🚨 Conversion error:', error.message);
    res.status(500).json({ 
      error: 'Conversion failed', 
      details: error.message 
    });
  }
});

// Статус конвертации
app.get('/api/conversion-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await axios.get(`https://api.cloudconvert.com/v2/jobs/${id}`, {
      headers: {
        'Authorization': `Bearer ${cloudConvertKey}`
      }
    });
    
    const jobData = response.data.data;
    console.log(`📊 Job ${id} status: ${jobData.status}`);
    
    let status = jobData.status;
    let downloadUrl = null;
    let step = 'wait';
    let fileSize = null;
    let stepPercent = 10;
    
    if (status === 'finished') {
      const exportTask = jobData.tasks.find(task => task.operation === 'export/url');
      if (exportTask && exportTask.result && exportTask.result.files) {
        downloadUrl = exportTask.result.files[0].url;
        fileSize = exportTask.result.files[0].size;
        step = 'finish';
        stepPercent = 100;
      }
    } else if (status === 'error') {
      const errorTask = jobData.tasks.find(task => task.status === 'error');
      return res.status(400).json({ 
        error: errorTask ? errorTask.message : 'CloudConvert job failed' 
      });
    } else if (status === 'processing') {
      step = 'convert';
      stepPercent = 50;
    }
    
    res.json({
      id: jobData.id,
      status: status,
      step: step,
      step_percent: stepPercent,
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

// Обработка всех остальных запросов
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(port, host, () => {
  console.log(`🚀 Simple Convertio Server running on http://${host}:${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Health check: http://${host}:${port}/api/health`);
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection:', reason);
});