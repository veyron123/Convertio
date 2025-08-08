const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testWebConversion() {
  console.log('=== ТЕСТ КОНВЕРТАЦИИ ЧЕРЕЗ ВЕБ API ===');
  
  try {
    // 1. Проверяем что сервер работает
    console.log('1. Проверяем сервер...');
    const healthResponse = await axios.get('http://localhost:3002/api/health');
    console.log('   Сервер работает:', healthResponse.data.status);
    
    // 2. Тестируем простую загрузку
    console.log('\n2. Тестируем загрузку файла...');
    const inputFile = path.join(__dirname, 'video for test', 'Screenshot (19).png');
    
    const testForm = new FormData();
    testForm.append('file', fs.createReadStream(inputFile));
    
    const testResponse = await axios.post('http://localhost:3002/api/test-upload', testForm, {
      headers: {
        ...testForm.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('   Тест загрузки:', testResponse.data.success ? 'УСПЕХ' : 'НЕУДАЧА');
    
    // 3. Тестируем полную конвертацию
    console.log('\n3. Тестируем конвертацию PNG -> JPG...');
    
    const convertForm = new FormData();
    convertForm.append('file', fs.createReadStream(inputFile));
    convertForm.append('outputformat', 'jpg');
    
    const convertResponse = await axios.post('http://localhost:3002/api/start-conversion', convertForm, {
      headers: {
        ...convertForm.getHeaders(),
      },
      timeout: 60000
    });
    
    if (convertResponse.status === 200 && convertResponse.data.id) {
      const jobId = convertResponse.data.id;
      console.log('   Конвертация запущена! Job ID:', jobId);
      
      // 4. Отслеживаем статус
      console.log('\n4. Отслеживаем прогресс...');
      
      for (let attempt = 1; attempt <= 15; attempt++) {
        console.log(`   Проверка ${attempt}/15...`);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const statusResponse = await axios.get(`http://localhost:3002/api/conversion-status/${jobId}`, {
          timeout: 15000
        });
        
        const statusData = statusResponse.data;
        const status = statusData.status;
        const step = statusData.step || 'unknown';
        
        console.log(`     Статус: ${status}, Этап: ${step}`);
        
        if (status === 'finished' && statusData.output) {
          const downloadUrl = statusData.output.url;
          console.log('\n✅ КОНВЕРТАЦИЯ ЗАВЕРШЕНА!');
          console.log('   URL результата:', downloadUrl);
          
          // 5. Скачиваем результат
          console.log('\n5. Скачиваем результат...');
          const downloadResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
          });
          
          if (downloadResponse.status === 200) {
            const outputFile = path.join(__dirname, 'video for test', 'Screenshot_19_WEB_TEST.jpg');
            
            fs.writeFileSync(outputFile, downloadResponse.data);
            
            const originalSize = fs.statSync(inputFile).size;
            const resultSize = downloadResponse.data.length;
            const compression = ((originalSize - resultSize) / originalSize * 100).toFixed(1);
            
            console.log('\n🎉 ТЕСТ УСПЕШНО ЗАВЕРШЕН!');
            console.log('📁 Результат сохранен:', outputFile);
            console.log('📊 Исходный размер:', (originalSize / 1024).toFixed(2), 'KB');
            console.log('📊 Размер результата:', (resultSize / 1024).toFixed(2), 'KB');
            console.log('📈 Сжатие:', compression + '%');
            
            return;
          } else {
            console.log('❌ Ошибка скачивания:', downloadResponse.status);
            return;
          }
        } else if (status === 'error') {
          console.log('❌ ОШИБКА конвертации:', statusData);
          return;
        } else if (status === 'processing') {
          console.log(`     ⏳ Обработка... (${step})`);
        }
      }
      
      console.log('⏰ Таймаут ожидания результата');
      
    } else {
      console.log('❌ Ошибка запуска конвертации:', convertResponse.status);
      console.log('   Ответ:', convertResponse.data);
    }
    
  } catch (error) {
    console.log('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Сервер не запущен! Запустите: npm start');
    } else if (error.code === 'ECONNRESET') {
      console.log('💡 Соединение разорвано. Возможно файл слишком большой.');
    } else if (error.response) {
      console.log('HTTP Status:', error.response.status);
      console.log('Response Data:', error.response.data);
    }
  }
}

// Запуск теста
testWebConversion();