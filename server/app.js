const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initializeSocketIO } = require('./socket');
const OpenAI = require('openai');
const ytdl = require('ytdl-core');

// Import routes
const youtubeRoutes = require('./routes/youtube');
const openaiRoutes = require('./routes/openai');
const profileRoutes = require('./routes/profiles');

const app = express();
const port = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with our server
const io = initializeSocketIO(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/youtube', youtubeRoutes);
app.use('/api/openai', openaiRoutes);
app.use('/api/profiles', profileRoutes);

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
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Server time: ${new Date().toISOString()}`);
  console.log(`Socket.IO test page available at http://localhost:${port}`);
}); 