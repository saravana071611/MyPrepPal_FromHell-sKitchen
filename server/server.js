/**
 * MyPrepPal Server
 * 
 * Main server file for the MyPrepPal application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initializeSocketIO } = require('./socket');
const apiRoutes = require('./api-routes');
const OpenAI = require('openai');
const ytdl = require('ytdl-core');

// Import specialized routes
const youtubeRoutes = require('./routes/youtube');
const openaiRoutes = require('./routes/openai');
const userRoutes = require('./routes/user');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with our server
const io = initializeSocketIO(server);

// Store io in app for use in routes
app.set('io', io);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Response formatter middleware to make meal prep guides more concise
app.use((req, res, next) => {
  // Store the original res.json function
  const originalJson = res.json;
  
  // Override the res.json function
  res.json = function(data) {
    // Check if this is a meal prep guide response
    if (data && data.mealPrepInfo) {
      // Make all text sections more concise
      Object.keys(data.mealPrepInfo).forEach(key => {
        if (typeof data.mealPrepInfo[key] === 'string') {
          // Remove unnecessary phrases and wordiness
          data.mealPrepInfo[key] = data.mealPrepInfo[key]
            .replace(/In conclusion,|Moving on to|For one,|In terms of|Please note,/g, '')
            .replace(/It's also worth noting that|It's important to note that|It is worth mentioning that/g, '')
            .replace(/In order to|In an effort to|In the interest of/g, 'To')
            .replace(/It is recommended to|We recommend to|You should/g, '')
            .replace(/For the purpose of|With the goal of|With the intention of/g, 'For')
            .replace(/\s+/g, ' ')
            .trim();
        }
      });
    }
    
    // Call the original json function
    return originalJson.call(this, data);
  };
  
  next();
});

// Serve static files from temp directory (for development)
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// API routes
app.use('/api', apiRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/openai', openaiRoutes);
app.use('/api/user', userRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('MyPrepPal API - Hell\'s Kitchen Edition');
});

// Enhanced status endpoint that checks OpenAI and YouTube APIs
app.get('/api/status', async (req, res) => {
  const status = {
    server: 'Connected',
    timestamp: new Date().toISOString(),
    openai: 'Disconnected',
    youtube: 'Disconnected'
  };

  // Check OpenAI API connection
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // Make a lightweight call to the OpenAI API to check connectivity
      await openai.models.list({ limit: 1 });
      status.openai = 'Connected';
    } catch (error) {
      console.error('OpenAI API connection check failed:', error.message);
      status.openai = 'Disconnected';
    }
  }

  // Check YouTube API connection
  try {
    // Use a popular video ID that's likely to be available for a long time
    const videoId = 'dQw4w9WgXcQ'; // Rick Astley's "Never Gonna Give You Up"
    await ytdl.getBasicInfo(videoId);
    status.youtube = 'Connected';
  } catch (error) {
    console.error('YouTube API connection check failed:', error.message);
    status.youtube = 'Disconnected';
  }

  res.json(status);
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Socket.IO available at http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please close any other applications using this port or choose a different port.`);
    console.error('You can try running: netstat -ano | findstr :5000');
    console.error('Or: Get-Process -Id (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess');
  } else {
    console.error('Error starting server:', err.message);
  }
});