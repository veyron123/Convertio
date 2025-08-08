// Интеграционные тесты - проверяем работу системы целиком
const request = require('supertest');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const mockAxios = new MockAdapter(axios);

describe('🔗 Integration Tests', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.CLOUDCONVERT_KEY = 'integration-test-key';
    
    app = require('../server-testable.js');
  });

  beforeEach(() => {
    mockAxios.reset();
  });

  afterAll(() => {
    if (app && app.close) {
      app.close();
    }
    mockAxios.restore();
  });

  describe('🔄 Complete Conversion Workflow', () => {
    test('Полный цикл: загрузка → конвертация → получение результата', async () => {
      const jobId = 'integration-test-job-456';
      
      // 1. Мокаем создание задачи
      mockAxios.onPost('https://api.cloudconvert.com/v2/jobs').reply(200, {
        data: {
          id: jobId,
          status: 'waiting'
        }
      });

      // 2. Начинаем конвертацию
      const uploadResponse = await request(app)
        .post('/api/start-conversion')
        .attach('file', Buffer.from('test image content'), 'test.png')
        .field('outputformat', 'jpg')
        .expect(200);

      expect(uploadResponse.body.id).toBe(jobId);

      // 3. Мокаем проверку статуса - в процессе
      mockAxios.onGet(`https://api.cloudconvert.com/v2/jobs/${jobId}`).reply(200, {
        data: {
          id: jobId,
          status: 'processing',
          tasks: []
        }
      });

      // 4. Проверяем статус - обрабатывается
      const processingResponse = await request(app)
        .get(`/api/conversion-status/${jobId}`)
        .expect(200);

      expect(processingResponse.body).toEqual({
        id: jobId,
        status: 'processing',
        step: 'processing',
        step_percent: 50
      });

      // 5. Мокаем завершенную конвертацию
      mockAxios.onGet(`https://api.cloudconvert.com/v2/jobs/${jobId}`).reply(200, {
        data: {
          id: jobId,
          status: 'finished',
          tasks: [
            {
              operation: 'export/url',
              result: {
                files: [
                  {
                    url: 'https://storage.cloudconvert.com/converted-file.jpg',
                    size: 45678
                  }
                ]
              }
            }
          ]
        }
      });

      // 6. Получаем завершенный результат
      const finishedResponse = await request(app)
        .get(`/api/conversion-status/${jobId}`)
        .expect(200);

      expect(finishedResponse.body).toEqual({
        id: jobId,
        status: 'finished',
        step: 'finish',
        step_percent: 100,
        output: {
          url: 'https://storage.cloudconvert.com/converted-file.jpg'
        }
      });
    });
  });

  describe('🚨 Error Handling Integration', () => {
    test('Обработка ошибок на всех этапах конвертации', async () => {
      // 1. Ошибка при загрузке файла (нет файла)
      await request(app)
        .post('/api/start-conversion')
        .field('outputformat', 'jpg')
        .expect(400);

      // 2. Ошибка CloudConvert API при создании задачи
      mockAxios.onPost('https://api.cloudconvert.com/v2/jobs').reply(500);

      await request(app)
        .post('/api/start-conversion')
        .attach('file', Buffer.from('test'), 'test.txt')
        .field('outputformat', 'pdf')
        .expect(500);

      // 3. Ошибка при проверке статуса несуществующей задачи
      mockAxios.onGet('https://api.cloudconvert.com/v2/jobs/nonexistent').reply(404);

      await request(app)
        .get('/api/conversion-status/nonexistent')
        .expect(500);

      // 4. Ошибка конвертации от CloudConvert
      mockAxios.onGet('https://api.cloudconvert.com/v2/jobs/error-job').reply(200, {
        data: {
          id: 'error-job',
          status: 'error',
          tasks: []
        }
      });

      await request(app)
        .get('/api/conversion-status/error-job')
        .expect(400);
    });
  });

  describe('🔒 Security Integration Tests', () => {
    test('Безопасность загрузки файлов', async () => {
      // Тест загрузки потенциально опасного файла
      const suspiciousContent = '<script>alert("xss")</script>';
      
      mockAxios.onPost('https://api.cloudconvert.com/v2/jobs').reply(200, {
        data: { id: 'security-test', status: 'waiting' }
      });

      const response = await request(app)
        .post('/api/start-conversion')
        .attach('file', Buffer.from(suspiciousContent), 'suspicious.html')
        .field('outputformat', 'pdf')
        .expect(200);

      // Файл должен обрабатываться нормально, без выполнения скриптов
      expect(response.body.id).toBe('security-test');
    });

    test('Валидация размера файла', async () => {
      // Создаем "большой" файл (имитируем)
      const largeFileBuffer = Buffer.alloc(1024); // 1KB для теста
      
      mockAxios.onPost('https://api.cloudconvert.com/v2/jobs').reply(200, {
        data: { id: 'large-file-test', status: 'waiting' }
      });

      // Должен принять файл нормального размера
      await request(app)
        .post('/api/start-conversion')
        .attach('file', largeFileBuffer, 'normal-file.txt')
        .field('outputformat', 'pdf')
        .expect(200);
    });
  });

  describe('⚡ Performance Integration Tests', () => {
    test('Производительность обработки нескольких запросов', async () => {
      const startTime = Date.now();
      const requests = [];
      
      // Мокаем успешные ответы для всех запросов
      mockAxios.onPost('https://api.cloudconvert.com/v2/jobs').reply(200, {
        data: { id: 'perf-test', status: 'waiting' }
      });

      // Создаем 5 одновременных запросов
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/start-conversion')
            .attach('file', Buffer.from(`test content ${i}`), `file${i}.txt`)
            .field('outputformat', 'pdf')
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Все запросы должны быть успешными
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe('perf-test');
      });

      // Время выполнения должно быть разумным
      expect(duration).toBeLessThan(5000); // Менее 5 секунд
    });
  });

  describe('🌐 API Contract Tests', () => {
    test('API должен соответствовать контракту', async () => {
      // Health check контракт
      const healthResponse = await request(app).get('/api/health');
      
      expect(healthResponse.body).toEqual(
        expect.objectContaining({
          status: expect.stringMatching(/^(ok|healthy)$/),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          uptime: expect.any(Number),
          api_key: expect.stringMatching(/^(configured|missing)$/)
        })
      );

      // Conversion start контракт
      mockAxios.onPost('https://api.cloudconvert.com/v2/jobs').reply(200, {
        data: { id: 'contract-test', status: 'waiting' }
      });

      const conversionResponse = await request(app)
        .post('/api/start-conversion')
        .attach('file', Buffer.from('test'), 'test.txt')
        .field('outputformat', 'pdf');

      expect(conversionResponse.body).toEqual(
        expect.objectContaining({
          id: expect.any(String)
        })
      );

      // Status check контракт
      mockAxios.onGet('https://api.cloudconvert.com/v2/jobs/contract-test').reply(200, {
        data: {
          id: 'contract-test',
          status: 'finished',
          tasks: [
            {
              operation: 'export/url',
              result: { files: [{ url: 'http://example.com/file.pdf' }] }
            }
          ]
        }
      });

      const statusResponse = await request(app).get('/api/conversion-status/contract-test');
      
      expect(statusResponse.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          status: expect.any(String),
          step: expect.any(String),
          step_percent: expect.any(Number)
        })
      );
    });
  });
});