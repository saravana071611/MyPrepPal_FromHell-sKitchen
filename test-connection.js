const axios = require('axios');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Read the port from file if it exists
const readPortFromFile = () => {
  try {
    const portFilePath = path.join(__dirname, 'server', 'data', 'port.txt');
    if (fs.existsSync(portFilePath)) {
      const port = fs.readFileSync(portFilePath, 'utf8').trim();
      return parseInt(port, 10);
    }
  } catch (error) {
    console.error('Error reading port file:', error.message);
  }
  return 5000; // Default port
};

const PORT = process.env.PORT || readPortFromFile();
const API_URL = `http://localhost:${PORT}`;

console.log(`Testing API connection to ${API_URL}`);

// Test simple status endpoint
const testStatus = async () => {
  try {
    console.log('Testing /api/status endpoint...');
    const response = await axios.get(`${API_URL}/api/status`, { timeout: 5000 });
    console.log('✅ Status API response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Status API error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
};

// Test OpenAI endpoint
const testOpenAI = async () => {
  const testData = {
    userId: 'test-user',
    age: 30,
    gender: 'Male',
    currentWeight: 80,
    currentHeight: 180,
    activityLevel: 'Moderate',
    targetWeight: 75
  };

  try {
    console.log('Testing OpenAI fitness-assessment endpoint...');
    console.log('Request data:', testData);
    
    // Create a custom Axios instance with increased timeout
    const instance = axios.create({
      timeout: 30000, // 30 seconds
    });
    
    const response = await instance.post(`${API_URL}/api/openai/fitness-assessment`, testData);
    console.log('✅ OpenAI API response received successfully');
    console.log('Response data length:', JSON.stringify(response.data).length, 'bytes');
    return true;
  } catch (error) {
    console.error('❌ OpenAI API error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
};

// Create a simple echo server to test if the API server can connect back
const startEchoServer = async (port) => {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Echo server running' }));
    });
    
    server.listen(port, () => {
      console.log(`Echo server running on port ${port}`);
      resolve(server);
    });
  });
};

// Run tests
(async () => {
  try {
    // First, test if the status endpoint is reachable
    const statusOk = await testStatus();
    if (!statusOk) {
      console.log('\n🔍 Troubleshooting tips:');
      console.log('1. Check if the server is running on port', PORT);
      console.log('2. Make sure there are no firewall rules blocking the connection');
      console.log('3. Check for any antivirus or security software that might block connections');
      console.log('4. Try restarting the server and client applications');
      return;
    }
    
    // Then test the OpenAI endpoint
    console.log('\nTesting OpenAI endpoints...');
    const openaiOk = await testOpenAI();
    
    if (!openaiOk) {
      console.log('\n🔍 Troubleshooting tips for OpenAI API:');
      console.log('1. Check that your OPENAI_API_KEY is valid in the .env file');
      console.log('2. Check if there might be a timeout issue - the OpenAI API might be taking too long to respond');
      console.log('3. Make sure your request payload is not too large');
      console.log('4. Check for API rate limits or quota issues');
      console.log('5. Look at the server logs for more detailed error information');
    }
    
    // Start an echo server on a different port to test bidirectional connectivity
    const echoPort = PORT + 1000; // Use a different port
    console.log(`\nStarting echo server on port ${echoPort} to test bidirectional connectivity...`);
    const echoServer = await startEchoServer(echoPort);
    
    console.log(`Please check if the server can reach this echo server by opening:\nhttp://localhost:${echoPort}\n`);
    console.log('Press Ctrl+C to stop the echo server when done testing.');
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
})(); 