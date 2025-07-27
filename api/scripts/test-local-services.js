const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const TOKEN = 'your-test-token-here'; // Replace with actual token

async function testLocalServices() {
  try {
    console.log('🧪 Testing Local Services API...\n');

    // Test 1: Get local services
    console.log('1. Testing GET /api/local-services?module=ptyss');
    try {
      const getResponse = await axios.get(`${BASE_URL}/local-services?module=ptyss`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ GET Response:', JSON.stringify(getResponse.data, null, 2));
    } catch (error) {
      console.log('❌ GET Error:', error.response?.data || error.message);
    }

    // Test 2: Create local service
    console.log('\n2. Testing POST /api/local-services');
    try {
      const createData = {
        name: 'Test Service',
        description: 'This is a test service',
        price: 25.50,
        module: 'ptyss'
      };
      const createResponse = await axios.post(`${BASE_URL}/local-services`, createData, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ POST Response:', JSON.stringify(createResponse.data, null, 2));
      
      const serviceId = createResponse.data.data?.service?._id || createResponse.data.data?._id;
      
      if (serviceId) {
        // Test 3: Update local service
        console.log('\n3. Testing PUT /api/local-services/:id');
        try {
          const updateData = {
            name: 'Updated Test Service',
            description: 'This is an updated test service',
            price: 30.00
          };
          const updateResponse = await axios.put(`${BASE_URL}/local-services/${serviceId}`, updateData, {
            headers: {
              'Authorization': `Bearer ${TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('✅ PUT Response:', JSON.stringify(updateResponse.data, null, 2));
        } catch (error) {
          console.log('❌ PUT Error:', error.response?.data || error.message);
        }

        // Test 4: Delete local service
        console.log('\n4. Testing DELETE /api/local-services/:id');
        try {
          const deleteResponse = await axios.delete(`${BASE_URL}/local-services/${serviceId}`, {
            headers: {
              'Authorization': `Bearer ${TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('✅ DELETE Response:', JSON.stringify(deleteResponse.data, null, 2));
        } catch (error) {
          console.log('❌ DELETE Error:', error.response?.data || error.message);
        }
      }
    } catch (error) {
      console.log('❌ POST Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLocalServices(); 