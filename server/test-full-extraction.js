const path = require('path');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const youtubeRouter = require('./routes/youtube');

// Create a mini Express app for testing
const app = express();
app.use(bodyParser.json());

// Mock socket.io
const mockIo = {
  to: () => ({
    emit: (event, data) => {
      console.log(`[Socket Event] ${event}:`, data);
    }
  })
};

// Attach mock io to app
app.set('io', mockIo);

// Set up the YouTube router
app.use('/api/youtube', youtubeRouter);

// Test function
async function testExtraction() {
  console.log('================================================');
  console.log('Testing full extraction process');
  console.log('================================================');
  
  const testUrl = 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Chicken Pot Pie recipe
  const socketId = 'test-socket-123';
  
  // Create a mock request and response
  const req = {
    body: {
      videoUrl: testUrl,
      socketId: socketId
    },
    app: app
  };
  
  const responses = [];
  const res = {
    status: (code) => {
      console.log(`Response status: ${code}`);
      return {
        json: (data) => {
          console.log('Response data:', data);
          responses.push({ status: code, data });
        }
      };
    },
    json: (data) => {
      console.log('Response data:', data);
      responses.push({ status: 200, data });
    }
  };
  
  try {
    // Directly call the route handler for extract-audio
    console.log('\n--- Testing extract-audio endpoint ---');
    await youtubeRouter.stack
      .filter(layer => layer.route && layer.route.path === '/extract-audio')
      .forEach(layer => {
        console.log('Calling extract-audio handler...');
        layer.route.stack[0].handle(req, res);
      });
    
    // Wait for the async operation to complete (hacky, but works for testing)
    console.log('\nWaiting for extraction to complete...');
    await new Promise(resolve => setTimeout(resolve, 20000)); // Wait 20 seconds
    
    // Check if files were created
    const tempDir = path.join(__dirname, 'temp');
    console.log('\nChecking temp directory for created files:');
    if (fs.existsSync(tempDir)) {
      // Filter for files created in the last minute
      const now = Date.now();
      const recentFiles = fs.readdirSync(tempDir)
        .filter(file => {
          const stats = fs.statSync(path.join(tempDir, file));
          return (now - stats.mtime.getTime()) < 60000; // Last minute
        });
      
      if (recentFiles.length > 0) {
        console.log('Recently created files:');
        recentFiles.forEach(file => {
          const filePath = path.join(tempDir, file);
          const stats = fs.statSync(filePath);
          console.log(`- ${file} (${(stats.size / 1024).toFixed(2)} KB, created: ${stats.mtime})`);
        });
      } else {
        console.log('No recently created files found');
      }
    } else {
      console.log('Temp directory does not exist!');
    }
    
    console.log('\n================================================');
    console.log('Test completed');
    console.log('================================================');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testExtraction(); 