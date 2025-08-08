const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function convertScreenshot() {
  const inputFile = path.join(__dirname, 'video for test', 'Screenshot (19).png');
  const outputDir = path.join(__dirname, 'video for test');
  
  console.log('=== КОНВЕРТАЦИЯ SCREENSHOT (19).PNG -> JPG ===');
  console.log('Входной файл:', inputFile);
  console.log('Папка результата:', outputDir);
  
  if (!fs.existsSync(inputFile)) {
    console.log('ОШИБКА: Файл Screenshot (19).png не найден');
    return;
  }
  
  const fileSize = fs.statSync(inputFile).size;
  console.log(`Размер файла: ${(fileSize / 1024).toFixed(2)} KB`);
  
  try {
    console.log('\nШаг 1: Запуск конвертации Screenshot (19).png...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(inputFile), 'Screenshot (19).png');
    form.append('outputformat', 'jpg');
    
    const response = await axios.post('http://localhost:3003/api/start-conversion', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 120000 // 2 минуты
    });
    
    if (response.status !== 200) {
      console.log(`ОШИБКА запуска: ${response.status}`);
      console.log(`Ответ: ${JSON.stringify(response.data, null, 2)}`);
      return;
    }
    
    const jobId = response.data.id;
    console.log(`Конвертация запущена! Job ID: ${jobId}`);
    
    console.log('\nШаг 2: Отслеживание прогресса конвертации...');
    
    for (let attempt = 1; attempt <= 30; attempt++) {
      console.log(`Проверка ${attempt}/30...`);
      
      try {
        const statusResponse = await axios.get(`http://localhost:3003/api/conversion-status/${jobId}`, {
          timeout: 15000
        });
        
        if (statusResponse.status !== 200) {
          console.log(`  Ошибка статуса: ${statusResponse.status}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        
        const statusData = statusResponse.data;
        const status = statusData.status || 'unknown';
        const step = statusData.step || 'unknown';
        const percent = statusData.step_percent || 0;
        
        console.log(`  Статус: ${status}, Этап: ${step}, Прогресс: ${percent}%`);
        
        if (status === 'finished' && statusData.output) {
          const downloadUrl = statusData.output.url;
          const fileSize = statusData.output.size || 'unknown';
          
          console.log('\n🎉 КОНВЕРТАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
          console.log('URL результата:', downloadUrl);
          console.log('Размер результата:', fileSize, 'байт');
          
          console.log('\nШаг 3: Скачивание результата...');
          const downloadResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
          });
          
          if (downloadResponse.status === 200) {
            const outputFile = path.join(outputDir, 'Screenshot_19_converted.jpg');
            
            fs.writeFileSync(outputFile, downloadResponse.data);
            
            const resultSize = downloadResponse.data.length;
            console.log(`✅ ГОТОВО! Файл сохранен: ${outputFile}`);
            console.log(`📊 Размер результата: ${(resultSize / 1024).toFixed(2)} KB`);
            console.log(`📈 Коэффициент сжатия: ${((fileSize - resultSize) / fileSize * 100).toFixed(1)}%`);
            
            if (fs.existsSync(outputFile)) {
              console.log('\n🎯 ТЕСТ УСПЕШНО ЗАВЕРШЕН!');
              console.log('Конвертированный файл находится в папке:', outputDir);
            } else {
              console.log('❌ ОШИБКА: Файл не был создан');
            }
            return;
          } else {
            console.log(`❌ Ошибка скачивания: ${downloadResponse.status}`);
            return;
          }
        } else if (status === 'error') {
          console.log(`❌ ОШИБКА конвертации:`, statusData);
          return;
        } else if (status === 'processing') {
          console.log(`  ⏳ Обработка в процессе... (${step})`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (statusError) {
        console.log(`  ⚠️  Ошибка получения статуса: ${statusError.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log('⏰ ТАЙМАУТ: Превышено время ожидания (2.5 минуты)');
    
  } catch (error) {
    console.log('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    if (error.response) {
      console.log('HTTP Status:', error.response.status);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code === 'ECONNRESET') {
      console.log('Подсказка: Возможно, файл слишком большой для текущих настроек сервера');
    }
  }
}

// Запуск конвертации
convertScreenshot();