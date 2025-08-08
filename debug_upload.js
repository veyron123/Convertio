const axios = require('axios');

async function debugTest() {
  console.log('=== DEBUG ТЕСТ ===');
  
  try {
    // 1. Health check
    console.log('1. Health check...');
    const health = await axios.get('http://localhost:3002/api/health');
    console.log('   Status:', health.data.status);
    
    // 2. Простой POST запрос
    console.log('\n2. Простой POST...');
    const simplePost = await axios.post('http://localhost:3002/api/test-upload', {
      test: 'data'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    console.log('   Простой POST:', simplePost.status);
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

debugTest();