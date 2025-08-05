# Документация Convertio API

## Обзор

Convertio API предоставляет RESTful интерфейс для конвертации файлов различных форматов. API работает по принципу асинхронной обработки:
1. Инициация конвертации с получением ID задачи
2. Отслеживание статуса выполнения
3. Получение результата

**Базовый URL:** `https://api.convertio.co`

**Документация:** https://convertio.co/api/

## Аутентификация

Все запросы требуют указания API ключа в параметре `apikey`. Получить ключ можно в личном кабинете на https://convertio.co/api/.

## Методы загрузки файлов

API поддерживает несколько способов передачи исходного файла:

| Метод | Описание |
|-------|----------|
| `url` | Ссылка на файл в интернете (по умолчанию) |
| `raw` | Прямая передача содержимого файла |
| `base64` | Файл закодированный в base64 |
| `upload` | Загрузка файла через PUT запрос |

## 1. Инициация конвертации

### POST `/convert`

Запускает новую задачу конвертации.

#### Параметры запроса:

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `apikey` | String | ✅ | Ваш API ключ |
| `input` | String | ❌ | Метод загрузки файла (по умолчанию: `url`) |
| `file` | String | ✅ | URL файла или содержимое (зависит от `input`) |
| `filename` | String | ⚠️ | Имя файла с расширением (обязательно для `raw`/`base64`) |
| `outputformat` | String | ✅ | Целевой формат конвертации |
| `options` | Object | ❌ | Дополнительные параметры конвертации |

#### Пример запроса (URL):
```bash
curl -X POST https://api.convertio.co/convert \
  -H "Content-Type: application/json" \
  -d '{
    "apikey": "YOUR_API_KEY",
    "input": "url",
    "file": "https://example.com/file.jpg",
    "outputformat": "png"
  }'
```

#### Пример запроса (Base64):
```bash
curl -X POST https://api.convertio.co/convert \
  -H "Content-Type: application/json" \
  -d '{
    "apikey": "YOUR_API_KEY",
    "input": "base64",
    "file": "iVBORw0KGgoAAAANSUhEUgAA...",
    "filename": "image.jpg",
    "outputformat": "png"
  }'
```

#### Успешный ответ:
```json
{
  "code": 200,
  "status": "ok",
  "data": {
    "id": "9712d01edc82e49c68d58ae6346d2013",
    "minutes": 107
  }
}
```

#### Ошибка:
```json
{
  "code": 401,
  "status": "error",
  "error": "This API Key is invalid"
}
```

## 2. Загрузка файла (только для input="upload")

### PUT `/convert/:id/:filename`

Загружает файл для предварительно созданной задачи конвертации.

#### Параметры:
- `id` - ID конвертации из первого запроса
- `filename` - Имя файла с расширением

#### Пример запроса:
```bash
curl -X PUT https://api.convertio.co/convert/9712d01edc82e49c68d58ae6346d2013/document.pdf \
  --upload-file document.pdf
```

#### Успешный ответ:
```json
{
  "code": 200,
  "status": "ok",
  "data": {
    "id": "9712d01edc82e49c68d58ae6346d2013",
    "file": "document.pdf",
    "size": "1025470"
  }
}
```

## 3. Проверка статуса конвертации

### GET `/convert/:id/status`

Получает текущий статус задачи конвертации.

#### Параметры:
- `id` - ID конвертации

#### Пример запроса:
```bash
curl https://api.convertio.co/convert/9712d01edc82e49c68d58ae6346d2013/status
```

#### Успешный ответ:
```json
{
  "code": 200,
  "status": "ok",
  "data": {
    "id": "9712d01edc82e49c68d58ae6346d2013",
    "step": "finish",
    "step_percent": 100,
    "minutes": 1,
    "output": {
      "url": "https://server.convertio.me/download/9712d01edc82e49c68d58ae6346d2013/result.png",
      "size": "36102"
    }
  }
}
```

### Статусы выполнения:

| Статус | Описание |
|--------|----------|
| `wait` | Ожидание в очереди |
| `upload` | Загрузка файла |
| `convert` | Процесс конвертации |
| `finish` | Конвертация завершена |

## Поддерживаемые форматы

### Изображения
JPG, PNG, GIF, BMP, TIFF, SVG, WEBP, ICO, PSD, RAW, AVIF, HEIC

### Документы  
PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT, ODS, ODP, RTF, TXT

### Аудио
MP3, WAV, FLAC, AAC, OGG, M4A, WMA, AIFF

### Видео
MP4, AVI, MOV, MKV, WMV, FLV, WEBM, 3GP, M4V

### Архивы
ZIP, RAR, 7Z, TAR, GZ, BZ2

### И многие другие...

Полный список поддерживаемых форматов доступен на https://convertio.co/formats/

## Ограничения

### Бесплатный аккаунт:
- Максимальный размер файла: 100 MB
- 25 минут конвертации в день
- Ограниченная скорость обработки

### Платные планы:
- Размер файла до 1-10 GB (в зависимости от плана)
- Неограниченные минуты
- Приоритетная очередь
- Дополнительные форматы

## Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Неверный запрос (отсутствуют обязательные параметры) |
| 401 | Неверный API ключ |
| 402 | Недостаточно минут для конвертации |
| 413 | Файл слишком большой |
| 422 | Неподдерживаемый формат конвертации |
| 500 | Внутренняя ошибка сервера |

## Примеры интеграции

### JavaScript (Frontend)
```javascript
async function convertFile(file, outputFormat, apiKey) {
  // 1. Инициация конвертации
  const formData = new FormData();
  formData.append('file', file);
  formData.append('outputformat', outputFormat);
  formData.append('apikey', apiKey);
  
  const startResponse = await fetch('https://api.convertio.co/convert', {
    method: 'POST',
    body: formData
  });
  
  const startData = await startResponse.json();
  const conversionId = startData.data.id;
  
  // 2. Ожидание завершения
  return await pollStatus(conversionId);
}

async function pollStatus(id) {
  while (true) {
    const response = await fetch(`https://api.convertio.co/convert/${id}/status`);
    const data = await response.json();
    
    if (data.data.step === 'finish') {
      return data.data.output.url;
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
```

### Node.js (Backend)
```javascript
const axios = require('axios');
const fs = require('fs');

async function convertFile(filePath, outputFormat, apiKey) {
  // Читаем файл и конвертируем в base64
  const fileBuffer = fs.readFileSync(filePath);
  const fileBase64 = fileBuffer.toString('base64');
  const filename = path.basename(filePath);
  
  // Инициация конвертации
  const response = await axios.post('https://api.convertio.co/convert', {
    apikey: apiKey,
    input: 'base64',
    file: fileBase64,
    filename: filename,
    outputformat: outputFormat
  });
  
  const conversionId = response.data.data.id;
  
  // Ожидание завершения
  while (true) {
    const statusResponse = await axios.get(
      `https://api.convertio.co/convert/${conversionId}/status`
    );
    
    const statusData = statusResponse.data.data;
    
    if (statusData.step === 'finish') {
      return statusData.output.url;
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
```

## Дополнительные параметры (options)

### Callback URL
```json
{
  "options": {
    "callback": "https://yoursite.com/webhook"
  }
}
```

### OCR для PDF
```json
{
  "options": {
    "ocr_enabled": true,
    "ocr_language": "eng"
  }
}
```

## Рекомендации по использованию

1. **Обработка ошибок**: Всегда проверяйте статус ответа и обрабатывайте ошибки
2. **Интервалы опроса**: Используйте интервал 2-5 секунд между запросами статуса
3. **Таймауты**: Устанавливайте разумные таймауты для долгих конвертаций
4. **Кеширование**: Кешируйте результаты для избежания повторных конвертаций
5. **Мониторинг квоты**: Отслеживайте оставшиеся минуты конвертации

## Поддержка

- **Документация**: https://convertio.co/api/
- **Поддержка**: support@convertio.co
- **Status Page**: https://status.convertio.co/