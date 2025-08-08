const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function testConversion() {
  const inputFile = path.join(__dirname, 'video for test', 'Screenshot (19).png');
  const outputDir = path.join(__dirname, 'video for test');
  
  console.log('=== ТЕСТ КОНВЕРТАЦИИ PNG -> JPG ===');
  console.log('Входной файл:', inputFile);
  console.log('Папка результата:', outputDir);
  
  if (!fs.existsSync(inputFile)) {
    console.log('ОШИБКА: Файл не найден');
    return;
  }
  
  const fileSize = fs.statSync(inputFile).size;
  console.log(`Размер файла: ${(fileSize / 1024).toFixed(2)} KB`);
  
  try {
    console.log('\nШаг 1: Запуск конвертации...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(inputFile));
    form.append('outputformat', 'jpg');
    
    const response = await axios.post('http://localhost:3002/api/start-conversion', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 60000
    });
    
    if (response.status !== 200) {
      console.log(`ОШИБКА запуска: ${response.status}`);
      console.log(`Ответ: ${response.data}`);
      return;
    }
    
    const jobId = response.data.id;
    console.log(`Конвертация запущена! Job ID: ${jobId}`);
    
    console.log('\nШаг 2: Ожидание результата...');
    
    for (let attempt = 1; attempt <= 20; attempt++) {
      console.log(`Проверка ${attempt}/20...`);
      
      const statusResponse = await axios.get(`http://localhost:3002/api/conversion-status/${jobId}`, {
        timeout: 10000
      });
      
      if (statusResponse.status !== 200) {
        console.log(`Ошибка статуса: ${statusResponse.status}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      const statusData = statusResponse.data;
      const status = statusData.status || 'unknown';
      const step = statusData.step || 'unknown';
      
      console.log(`  Статус: ${status}, Шаг: ${step}`);
      
      if (status === 'finished' && statusData.output) {
        const downloadUrl = statusData.output.url;
        console.log('\nУСПЕХ! Скачиваем результат...');
        console.log('URL:', downloadUrl);
        
        const downloadResponse = await axios.get(downloadUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        
        if (downloadResponse.status === 200) {
          const outputFile = path.join(outputDir, 'Screenshot_19_converted.jpg');
          
          fs.writeFileSync(outputFile, downloadResponse.data);
          
          console.log(`ГОТОВО! Файл сохранен: ${outputFile}`);
          console.log(`Размер результата: ${(downloadResponse.data.length / 1024).toFixed(2)} KB`);
          
          if (fs.existsSync(outputFile)) {
            console.log('ТЕСТ УСПЕШНО ЗАВЕРШЕН!');
          } else {
            console.log('ОШИБКА: Файл не был создан');
          }
          return;
        } else {
          console.log(`Ошибка скачивания: ${downloadResponse.status}`);
          return;
        }
      } else if (status === 'error') {
        console.log(`ОШИБКА конвертации:`, statusData);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('ТАЙМАУТ: Превышено время ожидания');
    
  } catch (error) {
    console.log('ОШИБКА:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Запускаем тест
testConversion();