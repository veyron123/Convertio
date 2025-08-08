// Unit и Integration тесты для простого сервера
const request = require('supertest');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

// Мокаем axios для изоляции тестов
const mockAxios = new MockAdapter(axios);

describe('🧪 Convertio Server Tests', () => {
  let app;

  beforeAll(() => {
    // Устанавливаем тестовую среду
    process.env.NODE_ENV = 'test';
    process.env.CLOUDCONVERT_KEY = 'test-api-key';
    
    // Импортируем тестируемую версию приложения
    app = require('../server-testable.js');
  });

  beforeEach(() => {
    // Сбрасываем моки перед каждым тестом
    mockAxios.reset();
  });

  afterAll(() => {
    // Закрываем сервер после тестов
    if (app && app.close) {
      app.close();
    }
    mockAxios.restore();
  });

  describe('🏥 Health Check Endpoints', () => {
    test('GET /api/health - должен возвращать статус OK', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          api_key: 'configured'
        })
      );
    });

    test('GET /health - должен возвращать простой статус', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'healthy' });
    });
  });

  describe('📁 File Conversion Endpoints', () => {
    test('POST /api/start-conversion - должен начать конвертацию с валидным файлом', async () => {
      // Мокаем CloudConvert API успешный ответ
      mockAxios.onPost('https://api.cloudconvert.com/v2/jobs').reply(200, {
        data: {
          id: 'test-job-123',
          status: 'waiting'
        }
      });

      const response = await request(app)
        .post('/api/start-conversion')
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .field('outputformat', 'pdf')
        .expect(200);

      expect(response.body).toEqual({
        id: 'test-job-123'
      });
    });

    test('POST /api/start-conversion - должен возвращать ошибку без файла', async () => {
      const response = await request(app)
        .post('/api/start-conversion')
        .field('outputformat', 'pdf')
        .expect(400);

      expect(response.body).toEqual({
        error: 'No file'
      });
    });

    test('POST /api/start-conversion - должен возвращать ошибку без формата', async () => {
      const response = await request(app)
        .post('/api/start-conversion')
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(400);

      expect(response.body).toEqual({
        error: 'No output format'
      });
    });

    test('POST /api/start-conversion - должен обрабатывать ошибки CloudConvert API', async () => {
      // Мокаем ошибку CloudConvert API
      mockAxios.onPost('https://api.cloudconvert.com/v2/jobs').reply(500, {
        error: 'Server error'
      });

      const response = await request(app)
        .post('/api/start-conversion')
        .attach('file', Buffer.from('test'), 'test.txt')
        .field('outputformat', 'pdf')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Conversion failed'
      });
    });
  });

  describe('📊 Conversion Status Endpoints', () => {
    test('GET /api/conversion-status/:id - должен возвращать статус в процессе', async () => {
      mockAxios.onGet('https://api.cloudconvert.com/v2/jobs/test-123').reply(200, {
        data: {
          id: 'test-123',
          status: 'processing',
          tasks: []
        }
      });

      const response = await request(app)
        .get('/api/conversion-status/test-123')
        .expect(200);

      expect(response.body).toEqual({
        id: 'test-123',
        status: 'processing',
        step: 'processing',
        step_percent: 50
      });
    });

    test('GET /api/conversion-status/:id - должен возвращать завершенную конвертацию', async () => {
      mockAxios.onGet('https://api.cloudconvert.com/v2/jobs/test-finished').reply(200, {
        data: {
          id: 'test-finished',
          status: 'finished',
          tasks: [
            {
              operation: 'export/url',
              result: {
                files: [
                  {
                    url: 'https://example.com/converted-file.pdf'
                  }
                ]
              }
            }
          ]
        }
      });

      const response = await request(app)
        .get('/api/conversion-status/test-finished')
        .expect(200);

      expect(response.body).toEqual({
        id: 'test-finished',
        status: 'finished',
        step: 'finish',
        step_percent: 100,
        output: {
          url: 'https://example.com/converted-file.pdf'
        }
      });
    });

    test('GET /api/conversion-status/:id - должен обрабатывать ошибки конвертации', async () => {
      mockAxios.onGet('https://api.cloudconvert.com/v2/jobs/test-error').reply(200, {
        data: {
          id: 'test-error',
          status: 'error',
          tasks: []
        }
      });

      const response = await request(app)
        .get('/api/conversion-status/test-error')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Conversion failed'
      });
    });

    test('GET /api/conversion-status/:id - должен обрабатывать ошибки API', async () => {
      mockAxios.onGet('https://api.cloudconvert.com/v2/jobs/test-api-error').reply(500);

      const response = await request(app)
        .get('/api/conversion-status/test-api-error')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Status check failed'
      });
    });
  });

  describe('🌐 Static File Serving', () => {
    test('GET / - должен отдавать главную страницу', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/html/);
    });

    test('GET /unknown-route - должен отдавать главную страницу (SPA)', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/html/);
    });
  });

  describe('🔑 API Key Configuration', () => {
    test('Сервер должен работать с установленным API ключом', () => {
      expect(process.env.CLOUDCONVERT_KEY).toBe('test-api-key');
    });

    test('POST /api/start-conversion - должен обрабатывать ошибки конвертации', async () => {
      // Мокаем ошибку при конвертации
      mockAxios.onPost('https://api.cloudconvert.com/v2/jobs').networkError();

      const response = await request(app)
        .post('/api/start-conversion')
        .attach('file', Buffer.from('test'), 'test.txt')
        .field('outputformat', 'pdf')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Conversion failed'
      });
    });
  });
});