// Тестируемая версия сервера - экспортируем app для тестов
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3002;
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const apiKey = process.env.CLOUDCONVERT_KEY || 
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMTg2NTU3Y2YxNzIzMjQ2M2U5N2ViMjU1NmU2YTA3NzQzYjkzZDY5NWI0YjNmYjFkZjE2NDFiY2M0ODllYmM2Y2ZjNzg3NjUzODdiMGExMjAiLCJpYXQiOjE3NTQ2Mjg2MzguMDk4MjgxLCJuYmYiOjE3NTQ2Mjg2MzguMDk4MjgyLCJleHAiOjQ5MTAzMDIyMzguMDkzMTkyLCJzdWIiOiI3MjYwOTY1MCIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.quQWj0jBbt8RVx9VyyCq1-dSU_wWL_V5j5ZRYdzcg9rNCHTNqaUdLRhpWsdYH9luC_evhn-UnvQ-cV0_jsSAOdERiH8F0W7l2SEf0zAMJDpdaCXwYuCBnaQnm8uJf0j6RWr0KLEzvQzIwTUzkt6gkzQoPJQx6-mnjy3NaUAN1zpCS9niMG94dbkrjuluqacLRMru-t_ykl0s7D0GzpolAcaH8NQ0O8iK3VRLXz9c1at62Cc9PxSz5e2op8qRqtrg6vwV7mazoVsfg4tP_qOL0YFdt8MZtZvdgFO4gHVsoyzIVDIfghOddXhaWQYvnY6JMrE0RH-xEyFpyyGHJNw15hLW5D4hM3sHOGYxZj6VNOkguoHjpQ4CG9PsIznTvdaVcdUG3m7KDEjwb9I31UPwjSqXslVCH8Wd_3XyPGTCzug3y0rbGLR2ttqPR-HrzO36mH8HIrVmFNCV1Sv4c71-QtZj8b0dJ23ZsOmHsteFphSub1blh4mW198WkddpyCOf5xYXi21w7hJ6C9zWz0vPLM6QbHjsS6dkwoWm56fYMCNFA_pIhCoeS6FWshLekvWUKSGeU_XWFR4P393Wrt48pG6JOhY8vtmYkpteYOayhkduGo-NV5dAra57H6JV0wiWsPqbAO4-YpfTS5M5CUMh-XYV11M1YA4QdA0WnMsn5JM';

// Логирование только если не тестовая среда
if (process.env.NODE_ENV !== 'test') {
  console.log(`🚀 Starting on port ${port}`);
  console.log(`🔑 API Key: ${apiKey ? 'OK' : 'MISSING'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

// Простая настройка middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Простая настройка загрузки файлов
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } 
});

// Health check - просто и ясно
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    api_key: apiKey ? 'configured' : 'missing'
  });
});

// Дополнительный health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Конвертация файла - основная функция
app.post('/api/start-conversion', upload.single('file'), async (req, res) => {
  try {
    // Простые проверки
    if (!req.file) return res.status(400).json({ error: 'No file' });
    if (!apiKey) return res.status(500).json({ error: 'API key missing' });
    if (!req.body.outputformat) return res.status(400).json({ error: 'No output format' });
    
    const { outputformat } = req.body;
    
    if (process.env.NODE_ENV !== 'test') {
      console.log(`Converting: ${req.file.originalname} → ${outputformat}`);
    }
    
    // Создаем задачу конвертации
    const response = await axios.post('https://api.cloudconvert.com/v2/jobs', {
      tasks: {
        'import': {
          operation: 'import/base64',
          file: req.file.buffer.toString('base64'),
          filename: req.file.originalname
        },
        'convert': {
          operation: 'convert',
          input: 'import',
          output_format: outputformat
        },
        'export': {
          operation: 'export/url',
          input: 'convert'
        }
      }
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const jobId = response.data.data.id;
    
    if (process.env.NODE_ENV !== 'test') {
      console.log(`✅ Job created: ${jobId}`);
    }
    
    res.json({ id: jobId });
    
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`❌ Error: ${error.message}`);
    }
    res.status(500).json({ error: 'Conversion failed' });
  }
});

// Проверка статуса конвертации - упрощенная версия
app.get('/api/conversion-status/:id', async (req, res) => {
  try {
    const response = await axios.get(`https://api.cloudconvert.com/v2/jobs/${req.params.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const job = response.data.data;
    let result = { 
      id: job.id, 
      status: job.status,
      step: 'processing',
      step_percent: 50
    };
    
    // Простая логика статусов
    if (job.status === 'finished') {
      const exportTask = job.tasks.find(task => task.operation === 'export/url');
      if (exportTask?.result?.files?.[0]) {
        result.step = 'finish';
        result.step_percent = 100;
        result.output = { url: exportTask.result.files[0].url };
      }
    } else if (job.status === 'error') {
      return res.status(400).json({ error: 'Conversion failed' });
    }
    
    res.json(result);
    
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`❌ Status error: ${error.message}`);
    }
    res.status(500).json({ error: 'Status check failed' });
  }
});

// Все остальные запросы - отдаем главную страницу
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Экспортируем app для тестов
module.exports = app;

// Запускаем сервер только если файл вызван напрямую (не в тестах)
if (require.main === module) {
  const server = app.listen(port, host, () => {
    console.log(`✅ Server running: http://${host}:${port}`);
  });
  
  // Простая обработка ошибок
  process.on('uncaughtException', err => console.error('Fatal error:', err.message));
  process.on('unhandledRejection', err => console.error('Promise error:', err.message));
}