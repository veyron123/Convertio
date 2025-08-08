const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function testConversion() {
    const cloudConvertKey = process.env.CLOUDCONVERT_KEY;
    
    if (!cloudConvertKey) {
        console.error('CLOUDCONVERT_KEY not set');
        return;
    }

    try {
        console.log('🧪 Testing CloudConvert API directly...');
        
        // Читаем тестовый файл
        const fileBuffer = fs.readFileSync('test.png');
        const base64File = fileBuffer.toString('base64');
        
        console.log(`📄 File size: ${fileBuffer.length} bytes`);
        console.log('🔄 Creating CloudConvert job...');
        
        // Создаем job в CloudConvert
        const response = await axios.post('https://api.cloudconvert.com/v2/jobs', {
            tasks: {
                'import-file': {
                    operation: 'import/base64',
                    file: base64File,
                    filename: 'test.png'
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
            }
        });

        const jobId = response.data.data.id;
        console.log(`✅ Job created successfully: ${jobId}`);
        
        // Ждем завершения конвертации
        let jobStatus = 'waiting';
        let attempts = 0;
        const maxAttempts = 30;
        
        while (jobStatus !== 'finished' && jobStatus !== 'error' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Ждем 3 секунды
            
            const statusResponse = await axios.get(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${cloudConvertKey}`
                }
            });
            
            jobStatus = statusResponse.data.data.status;
            attempts++;
            
            console.log(`📊 Status check ${attempts}: ${jobStatus}`);
        }
        
        if (jobStatus === 'finished') {
            const finalJob = await axios.get(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${cloudConvertKey}`
                }
            });
            
            const exportTask = finalJob.data.data.tasks.find(task => task.operation === 'export/url');
            if (exportTask && exportTask.result && exportTask.result.files) {
                const downloadUrl = exportTask.result.files[0].url;
                const fileSize = exportTask.result.files[0].size;
                
                console.log(`🎉 Conversion completed!`);
                console.log(`📥 Download URL: ${downloadUrl}`);
                console.log(`📄 File size: ${fileSize} bytes`);
                
                // Скачиваем сконвертированный файл
                console.log('💾 Downloading converted file...');
                const fileResponse = await axios.get(downloadUrl, { 
                    responseType: 'arraybuffer' 
                });
                
                fs.writeFileSync('test_converted.jpg', fileResponse.data);
                console.log('✅ File saved as test_converted.jpg');
                
                return {
                    success: true,
                    jobId: jobId,
                    downloadUrl: downloadUrl,
                    fileSize: fileSize,
                    localFile: 'test_converted.jpg'
                };
            }
        } else if (jobStatus === 'error') {
            console.error('❌ Job failed');
            return { success: false, error: 'Job failed' };
        } else {
            console.error('⏱️ Job timed out');
            return { success: false, error: 'Timeout' };
        }
        
    } catch (error) {
        console.error('🚨 Error:', error.response ? error.response.data : error.message);
        return { success: false, error: error.message };
    }
}

// Запуск теста
testConversion().then(result => {
    console.log('\n📋 Final result:', result);
    process.exit(result.success ? 0 : 1);
});