const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function manualConversion() {
  console.log('=== РУЧНАЯ КОНВЕРТАЦИЯ ЧЕРЕЗ API ===');
  
  try {
    // 1. Читаем файл как base64
    const inputFile = path.join(__dirname, 'video for test', 'Screenshot (19).png');
    const fileBuffer = fs.readFileSync(inputFile);
    const base64File = fileBuffer.toString('base64');
    const filename = 'Screenshot_19.png';
    
    console.log('Файл прочитан, размер:', fileBuffer.length, 'байт');
    console.log('Base64 длина:', base64File.length, 'символов');
    
    // 2. Создаем job напрямую через CloudConvert API
    const cloudConvertKey = process.env.CLOUDCONVERT_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYTdkN2NmNzIyZGRjM2IzNjA1YmExMmRkZDM0ZTQxOTE2OGJhMWVmNGI2MGYyMDMxMzVlNTQyZjNkZGY1MjkwOWE2ODAzNDcwYmY2ZTE0MjkiLCJpYXQiOjE3NTQ1Njg4ODAuNjc5NDY5LCJuYmYiOjE3NTQ1Njg4ODAuNjc5NDcsImV4cCI6NDkxMDI0MjQ4MC42NzM0OTUsInN1YiI6IjcyNjA5NjUwIiwic2NvcGVzIjpbInVzZXIucmVhZCIsInVzZXIud3JpdGUiLCJ0YXNrLnJlYWQiLCJ0YXNrLndyaXRlIiwid2ViaG9vay5yZWFkIiwid2ViaG9vay53cml0ZSIsInByZXNldC5yZWFkIiwicHJlc2V0LndyaXRlIl19.r_cf1eXVufgYMaGJ_QKt8XlzkqE1MpBUPclaYta9iChVUss8jeCHjpRtXkn_6ne9_Mm8tOFEZkEUPRnf2rPd7Wo7HXO4AkNb0EdkKtZR6iGmW6oCd3rMaUoemTsNIzEaBEeWF2W0XDW6LqKtOy9N_vglE_2mUZ9C6g41k8PALJSdyxL8cAZb442orSbsPZSC2XTeBJnajsiSsmJkpoyd9acYigCSxx0g5cgPjXcIyJ2QSs5ZKKQ-KJSMm_F9TwIGupyGTpVPFI4svPRQWzdpJEOa_kymMRLvgdgjP9pAdk5ONxcjPEs9E_rKJLIT_dghRN6El1U8wYO2xniT78D1B8Y8SS8JB3pMU7cKNOYWeNaVv4Cp8DBR_Z2CowMpQSrDyKST7PND6djgZ8VxYd6lAVWExz1o8KuzvbKcMeH12JTh0830scDrnH_VDV8pD3l1ZZzcO0H4MGzyt32osm_gJ-Mkfn49V2vAYL7iL6mIUweMZL6UHnoqwel6di0KttaNPi13cqtQBTh7FtNL2w2fr0N9e424ax1cSKqUwnnJMZOvhwa9nVgUmcpI1Bw7tkdvX_rbHHbZm0NqrBrgO1vmFSsQ8oT7fDclPlv8_dzM8wbYKG2264R1Z_T1WKhjm4dZAs5ZoQm3OxMpJI48QGYPsT4vodArXmV_jB4exIITxoQ';
    
    console.log('Создаем CloudConvert job...');
    
    const response = await axios.post('https://api.cloudconvert.com/v2/jobs', {
      tasks: {
        'import-file': {
          operation: 'import/base64',
          file: base64File,
          filename: filename
        },
        'convert-file': {
          operation: 'convert',
          input: 'import-file',
          output_format: 'jpg'
        },
        'export-file': {
          operation: 'export/url',
          input: 'convert-file'
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${cloudConvertKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    if (response.status === 200 || response.status === 201) {
      const jobId = response.data.data.id;
      console.log('Job создан:', jobId);
      
      // 3. Ожидаем завершения
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await axios.get(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${cloudConvertKey}`
          }
        });
        
        const jobData = statusResponse.data.data;
        console.log(`Проверка ${i+1}: ${jobData.status}`);
        
        if (jobData.status === 'finished') {
          const exportTask = jobData.tasks.find(task => task.operation === 'export/url');
          if (exportTask && exportTask.result && exportTask.result.files) {
            const downloadUrl = exportTask.result.files[0].url;
            
            console.log('УСПЕХ! Скачиваем результат...');
            const downloadResponse = await axios.get(downloadUrl, {
              responseType: 'arraybuffer'
            });
            
            const outputFile = path.join(__dirname, 'video for test', 'Screenshot_19_DIRECT.jpg');
            fs.writeFileSync(outputFile, downloadResponse.data);
            
            console.log(`✅ ЗАВЕРШЕНО! Файл сохранен: ${outputFile}`);
            console.log(`📊 Размер результата: ${(downloadResponse.data.length / 1024).toFixed(2)} KB`);
            
            // Показываем информацию о файлах
            const originalSize = fileBuffer.length;
            const resultSize = downloadResponse.data.length;
            const compression = ((originalSize - resultSize) / originalSize * 100).toFixed(1);
            
            console.log('\n=== РЕЗУЛЬТАТ КОНВЕРТАЦИИ ===');
            console.log(`Исходный PNG: ${(originalSize / 1024).toFixed(2)} KB`);
            console.log(`Результат JPG: ${(resultSize / 1024).toFixed(2)} KB`);
            console.log(`Степень сжатия: ${compression}%`);
            console.log(`Местоположение: ${outputFile}`);
            
            return;
          }
        } else if (jobData.status === 'error') {
          console.log('ОШИБКА:', jobData);
          return;
        }
      }
      
      console.log('Таймаут ожидания');
    } else {
      console.log('Ошибка создания job:', response.status);
    }
    
  } catch (error) {
    console.log('Ошибка:', error.message);
    if (error.response) {
      console.log('Response:', error.response.data);
    }
  }
}

manualConversion();