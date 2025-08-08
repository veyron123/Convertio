// KISS принцип: Простой и понятный файл-конвертер
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;
const API_KEY = process.env.CLOUDCONVERT_KEY || 
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMTg2NTU3Y2YxNzIzMjQ2M2U5N2ViMjU1NmU2YTA3NzQzYjkzZDY5NWI0YjNmYjFkZjE2NDFiY2M0ODllYmM2Y2ZjNzg3NjUzODdiMGExMjAiLCJpYXQiOjE3NTQ2Mjg2MzguMDk4MjgxLCJuYmYiOjE3NTQ2Mjg2MzguMDk4MjgyLCJleHAiOjQ5MTAzMDIyMzguMDkzMTkyLCJzdWIiOiI3MjYwOTY1MCIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.quQWj0jBbt8RVx9VyyCq1-dSU_wWL_V5j5ZRYdzcg9rNCHTNqaUdLRhpWsdYH9luC_evhn-UnvQ-cV0_jsSAOdERiH8F0W7l2SEf0zAMJDpdaCXwYuCBnaQnm8uJf0j6RWr0KLEzvQzIwTUzkt6gkzQoPJQx6-mnjy3NaUAN1zpCS9niMG94dbkrjuluqacLRMru-t_ykl0s7D0GzpolAcaH8NQ0O8iK3VRLXz9c1at62Cc9PxSz5e2op8qRqtrg6vwV7mazoVsfg4tP_qOL0YFdt8MZtZvdgFO4gHVsoyzIVDIfghOddXhaWQYvnY6JMrE0RH-xEyFpyyGHJNw15hLW5D4hM3sHOGYxZj6VNOkguoHjpQ4CG9PsIznTvdaVcdUG3m7KDEjwb9I31UPwjSqXslVCH8Wd_3XyPGTCzug3y0rbGLR2ttqPR-HrzO36mH8HIrVmFNCV1Sv4c71-QtZj8b0dJ23ZsOmHsteFphSub1blh4mW198WkddpyCOf5xYXi21w7hJ6C9zWz0vPLM6QbHjsS6dkwoWm56fYMCNFA_pIhCoeS6FWshLekvWUKSGeU_XWFR4P393Wrt48pG6JOhY8vtmYkpteYOayhkduGo-NV5dAra57H6JV0wiWsPqbAO4-YpfTS5M5CUMh-XYV11M1YA4QdA0WnMsn5JM';

// Простая конфигурация
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Простая настройка загрузки файлов
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } 
});

console.log(`🚀 Server starting on port ${PORT}`);
console.log(`🔑 API Key: ${API_KEY ? 'OK' : 'MISSING'}`);

// Health check - просто и ясно
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    api_key: API_KEY ? 'configured' : 'missing'
  });
});

// Конвертация файла - основная функция
app.post('/api/start-conversion', upload.single('file'), async (req, res) => {
  try {
    // Проверки
    if (!req.file) return res.status(400).json({ error: 'No file' });
    if (!API_KEY) return res.status(500).json({ error: 'API key missing' });
    if (!req.body.outputformat) return res.status(400).json({ error: 'No output format' });

    console.log(`Converting: ${req.file.originalname} → ${req.body.outputformat}`);

    // Создаем задачу конвертации
    const jobResponse = await axios.post('https://api.cloudconvert.com/v2/jobs', {
      tasks: {
        'import': {
          operation: 'import/base64',
          file: req.file.buffer.toString('base64'),
          filename: req.file.originalname
        },
        'convert': {
          operation: 'convert',
          input: 'import',
          output_format: req.body.outputformat
        },
        'export': {
          operation: 'export/url',
          input: 'convert'
        }
      }
    }, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    const jobId = jobResponse.data.data.id;
    console.log(`Job created: ${jobId}`);
    res.json({ id: jobId });

  } catch (error) {
    console.error(`Conversion error: ${error.message}`);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

// Проверка статуса конвертации
app.get('/api/conversion-status/:id', async (req, res) => {
  try {
    const response = await axios.get(`https://api.cloudconvert.com/v2/jobs/${req.params.id}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
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
    console.error(`Status error: ${error.message}`);
    res.status(500).json({ error: 'Status check failed' });
  }
});

// Все остальные запросы - отдаем главную страницу
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running: http://${HOST}:${PORT}`);
});

// Простая обработка ошибок
process.on('uncaughtException', err => console.error('Fatal error:', err.message));
process.on('unhandledRejection', err => console.error('Promise error:', err.message));