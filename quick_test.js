const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function quickTest() {
  console.log('=== БЫСТРЫЙ ТЕСТ С МИНИМАЛЬНЫМ ФАЙЛОМ ===');
  
  try {
    // Используем уже созданный маленький тестовый PNG файл
    const smallFile = path.join(__dirname, 'test_small.png');
    
    if (!fs.existsSync(smallFile)) {
      console.log('Создаем минимальный тестовый PNG...');
      // Создаем минимальный PNG (1x1 пиксель)
      const minimalPNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF,
        0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
      ]);
      fs.writeFileSync(smallFile, minimalPNG);
    }
    
    console.log('Используем файл:', smallFile);
    console.log('Размер файла:', fs.statSync(smallFile).size, 'байт');
    
    // Тест конвертации
    console.log('\nЗапускаем конвертацию...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(smallFile));
    form.append('outputformat', 'jpg');
    
    const response = await axios.post('http://localhost:3002/api/start-conversion', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('Ответ сервера:', response.status);
    console.log('Job ID:', response.data.id);
    
    // Проверяем статус
    const jobId = response.data.id;
    
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const statusResponse = await axios.get(`http://localhost:3002/api/conversion-status/${jobId}`);
        console.log(`Статус ${i+1}: ${statusResponse.data.status}`);
        
        if (statusResponse.data.status === 'finished') {
          console.log('✅ УСПЕХ! Конвертация завершена');
          if (statusResponse.data.output) {
            console.log('URL результата:', statusResponse.data.output.url);
            
            // Скачиваем результат
            const downloadResponse = await axios.get(statusResponse.data.output.url, {
              responseType: 'arraybuffer'
            });
            
            const outputFile = path.join(__dirname, 'video for test', 'small_test_result.jpg');
            fs.writeFileSync(outputFile, downloadResponse.data);
            console.log('✅ Результат сохранен:', outputFile);
          }
          return;
        } else if (statusResponse.data.status === 'error') {
          console.log('❌ Ошибка:', statusResponse.data);
          return;
        }
      } catch (statusError) {
        console.log('Ошибка получения статуса:', statusError.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
    if (error.response) {
      console.log('Response:', error.response.data);
    }
  }
}

quickTest();