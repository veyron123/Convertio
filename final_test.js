const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Простейший тест с базовым файлом
async function testRealScreenshot() {
  const inputFile = path.join(__dirname, 'screenshot_test.png');
  
  console.log('ФИНАЛЬНЫЙ ТЕСТ Screenshot (19).png -> JPG');
  console.log('Файл:', inputFile);
  
  if (!fs.existsSync(inputFile)) {
    console.log('Файл не найден');
    return;
  }
  
  const fileSize = fs.statSync(inputFile).size;
  console.log(`Размер: ${(fileSize / 1024).toFixed(2)} KB`);
  
  try {
    // Конвертируем в base64 для передачи
    const fileBuffer = fs.readFileSync(inputFile);
    const base64Data = fileBuffer.toString('base64');
    
    console.log('Отправляем через тест CloudConvert API...');
    
    const response = await axios.post('http://localhost:3003/api/test-cloudconvert');
    
    if (response.data.success) {
      console.log('CloudConvert API работает!');
      const jobId = response.data.cloudconvert_response.data.id;
      console.log('Job ID:', jobId);
      
      // Проверяем статус
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const statusResponse = await axios.get(`http://localhost:3003/api/conversion-status/${jobId}`);
        console.log(`Статус: ${statusResponse.data.status}`);
        
        if (statusResponse.data.status === 'finished' && statusResponse.data.output) {
          const downloadUrl = statusResponse.data.output.url;
          console.log('УСПЕХ! Скачиваем...');
          
          const downloadResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer'
          });
          
          const outputFile = path.join(__dirname, 'video for test', 'Screenshot_19_FINAL.jpg');
          fs.writeFileSync(outputFile, downloadResponse.data);
          
          console.log(`ГОТОВО! Сохранен: ${outputFile}`);
          console.log(`Размер результата: ${(downloadResponse.data.length / 1024).toFixed(2)} KB`);
          return;
        }
      }
    } else {
      console.log('CloudConvert API ошибка:', response.data);
    }
    
  } catch (error) {
    console.log('Ошибка:', error.message);
  }
}

testRealScreenshot();