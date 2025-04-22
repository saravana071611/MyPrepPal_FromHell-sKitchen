const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const http = require('http');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
let PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const openaiRoutes = require('./routes/openai');
const youtubeRoutes = require('./routes/youtube');
const userRoutes = require('./routes/user');

// Use routes
app.use('/api/openai', openaiRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/user', userRoutes);

// Create necessary data directories
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Ensure data directories exist
ensureDirectoryExists(path.join(__dirname, 'data'));
ensureDirectoryExists(path.join(__dirname, 'data/profiles'));
ensureDirectoryExists(path.join(__dirname, 'data/audio'));
ensureDirectoryExists(path.join(__dirname, 'data/temp'));

// Import our port checker utility
const portChecker = require('./utils/port-checker');

// API status endpoint
app.get('/api/status', async (req, res) => {
  const status = {
    openai: 'Disconnected',
    youtube: 'Disconnected'
  };

  // Test OpenAI API
  if (process.env.OPENAI_API_KEY) {
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      // If API key is too short or looks invalid, don't even try to connect
      if (process.env.OPENAI_API_KEY.length < 10) {
        console.log('OpenAI API key looks invalid (too short)');
        status.openai = 'Invalid API Key';
      } else {
        // Simple models list request to verify connectivity
        try {
          await openai.models.list();
          status.openai = 'Connected';
        } catch (apiError) {
          console.error('OpenAI API request failed:', apiError.message);
          // Check if it's an authentication error
          if (apiError.message.includes('auth') || apiError.message.includes('API key')) {
            status.openai = 'Invalid API Key';
          } else {
            status.openai = 'Connection Failed';
          }
        }
      }
    } catch (error) {
      console.error('OpenAI module error:', error.message);
      status.openai = 'Module Error';
    }
  } else {
    console.log('OpenAI API key not provided');
    status.openai = 'No API Key';
    
    // Set mock mode for OpenAI functionality
    global.OPENAI_MOCK_MODE = true;
  }

  // Test YouTube API 
  if (process.env.YOUTUBE_API_KEY) {
    try {
      // Test with ytdl-core by getting info for a known video ID
      const ytdl = require('ytdl-core');
      try {
        await ytdl.getBasicInfo('dQw4w9WgXcQ');
        status.youtube = 'Connected';
      } catch (ytdlError) {
        console.error('YouTube API test failed:', ytdlError.message);
        if (ytdlError.message.includes('auth') || ytdlError.message.includes('API key')) {
          status.youtube = 'Invalid API Key';
        } else {
          status.youtube = 'Connection Failed';
        }
      }
    } catch (error) {
      console.error('YouTube module error:', error.message);
      status.youtube = 'Module Error';
    }
  } else {
    console.log('YouTube API not provided');
    status.youtube = 'No API Key';
  }

  // Return API status including mock mode indicator
  res.json({
    ...status,
    mockMode: global.OPENAI_MOCK_MODE === true
  });
});

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Updated function to try starting the server on different ports if the initial one fails
const startServer = async (port) => {
  try {
    // First check if the requested port is available
    const isFree = await portChecker.isPortFree(port);
    
    if (!isFree) {
      console.log(`Port ${port} is already in use. Finding an available port...`);
      port = await portChecker.findFreePort(port + 1);
    }
    
    // Create and start the server
    const server = http.createServer(app);
    
    server.on('error', (e) => {
      console.error('Server error:', e.message);
      process.exit(1);
    });
    
    server.listen(port, () => {
      // Update PORT variable to ensure client can connect to the correct port
      PORT = port;
      console.log(`Server running on port ${PORT}`);
      
      // Save the port to files using our utility
      portChecker.savePortToFile(PORT);
      
      // Optionally update the client's port configuration
      console.log(`Note for client: API endpoint is http://localhost:${PORT}/api`);
      console.log(`For detailed API information, run: node api-info.js`);
    });
    
    return server;
  } catch (error) {
    console.error('Error starting server:', error.message);
    process.exit(1);
  }
};

// Start the server using our new async approach
(async () => {
  try {
    await startServer(PORT);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
})();