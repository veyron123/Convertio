const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testSimpleServer() {
  console.log('=== ТЕСТ ПРОСТОГО СЕРВЕРА НА ПОРТУ 3004 ===');
  
  try {
    // 1. Health check
    console.log('1. Health check...');
    const health = await axios.get('http://localhost:3004/api/health');
    console.log('   Статус:', health.data.status);
    
    // 2. Тест конвертации
    console.log('\n2. Тест конвертации Screenshot (19).png...');
    const inputFile = path.join(__dirname, 'video for test', 'Screenshot (19).png');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(inputFile));
    form.append('outputformat', 'jpg');
    
    console.log('   Отправляем файл...');
    const convertResponse = await axios.post('http://localhost:3004/api/start-conversion', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 60000
    });
    
    console.log('   Конвертация запущена! Job ID:', convertResponse.data.id);
    const jobId = convertResponse.data.id;
    
    // 3. Проверяем статус
    console.log('\n3. Проверяем статус...');
    
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await axios.get(`http://localhost:3004/api/conversion-status/${jobId}`);
      const status = statusResponse.data.status;
      const step = statusResponse.data.step;
      const percent = statusResponse.data.step_percent;
      
      console.log(`   Попытка ${i+1}: ${status} (${step}) - ${percent}%`);
      
      if (status === 'finished' && statusResponse.data.output) {
        console.log('\n✅ КОНВЕРТАЦИЯ ЗАВЕРШЕНА!');
        
        // Скачиваем результат
        const downloadUrl = statusResponse.data.output.url;
        const downloadResponse = await axios.get(downloadUrl, {
          responseType: 'arraybuffer'
        });
        
        const outputFile = path.join(__dirname, 'video for test', 'Screenshot_19_SIMPLE.jpg');
        fs.writeFileSync(outputFile, downloadResponse.data);
        
        const originalSize = fs.statSync(inputFile).size;
        const resultSize = downloadResponse.data.length;
        const compression = ((originalSize - resultSize) / originalSize * 100).toFixed(1);
        
        console.log('📁 Результат сохранен:', outputFile);
        console.log('📊 Исходный размер:', (originalSize / 1024).toFixed(2), 'KB');
        console.log('📊 Размер результата:', (resultSize / 1024).toFixed(2), 'KB');
        console.log('📈 Сжатие:', compression + '%');
        console.log('\n🎉 ПРОСТОЙ СЕРВЕР РАБОТАЕТ ОТЛИЧНО!');
        return;
      } else if (status === 'error') {
        console.log('❌ Ошибка конвертации:', statusResponse.data);
        return;
      }
    }
    
    console.log('⏰ Таймаут ожидания');
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

testSimpleServer();