const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function simpleCurlTest() {
  console.log('=== ПРОСТОЙ ТЕСТ API ===');
  
  try {
    // Тест 1: Health check
    console.log('1. Тест Health Check...');
    const healthResponse = await axios.get('http://localhost:3002/api/health');
    console.log('   Результат:', healthResponse.data.status);
    
    // Тест 2: CloudConvert API
    console.log('2. Тест CloudConvert API...');
    const ccResponse = await axios.get('http://localhost:3002/api/test-cloudconvert');
    console.log('   Результат:', ccResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    if (ccResponse.data.success) {
      const jobId = ccResponse.data.cloudconvert_response.data.id;
      console.log('   Job ID:', jobId);
      
      // Тест 3: Проверяем статус тестового job
      console.log('3. Проверяем статус job...');
      
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const statusResponse = await axios.get(`http://localhost:3002/api/conversion-status/${jobId}`);
          const status = statusResponse.data.status;
          console.log(`   Попытка ${i+1}: ${status}`);
          
          if (status === 'finished') {
            console.log('   УСПЕХ! Конвертация завершена');
            if (statusResponse.data.output) {
              console.log('   URL результата:', statusResponse.data.output.url);
              
              // Скачиваем и сохраняем результат
              const downloadResponse = await axios.get(statusResponse.data.output.url, {
                responseType: 'arraybuffer'
              });
              
              const resultFile = path.join(__dirname, 'video for test', 'test_result.jpg');
              fs.writeFileSync(resultFile, downloadResponse.data);
              console.log('   Результат сохранен:', resultFile);
            }
            break;
          } else if (status === 'error') {
            console.log('   ОШИБКА конвертации');
            break;
          }
        } catch (statusError) {
          console.log(`   Ошибка статуса: ${statusError.message}`);
        }
      }
    }
    
    console.log('\nТЕСТ ЗАВЕРШЕН');
    
  } catch (error) {
    console.log('ОШИБКА:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

simpleCurlTest();