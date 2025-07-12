const axios = require('axios');
require('dotenv').config({ path: './thesplitbox/.env' });

async function testAlbyAPI() {
  const token = process.env.ALBY_ACCESS_TOKEN;
  
  if (!token) {
    console.log('❌ No Alby API token found in .env');
    return;
  }
  
  console.log('✅ Alby API token found:', token.substring(0, 10) + '...');
  
  try {
    // Test account info endpoint
    const response = await axios.get('https://api.getalby.com/user/value4value', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Alby API connection successful!');
    console.log('Account info:', response.data);
    
    // Test if keysend is available
    const balanceResponse = await axios.get('https://api.getalby.com/balance', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Balance check successful!');
    console.log('Balance:', balanceResponse.data);
    
  } catch (error) {
    console.log('❌ Alby API test failed:', error.response?.data || error.message);
  }
}

testAlbyAPI();