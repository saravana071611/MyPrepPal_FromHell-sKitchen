const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { exec } = require('child_process');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

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

// API status endpoint
app.get('/api/status', async (req, res) => {
  const status = {
    openai: 'Disconnected',
    youtube: 'Disconnected'
  };

  // Test OpenAI API
  if (process.env.OPENAI_API_KEY) {
    try {
      const { Configuration, OpenAIApi } = require('openai');
      const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const openai = new OpenAIApi(configuration);
      
      // Simple model list request to verify connectivity
      await openai.listModels();
      status.openai = 'Connected';
    } catch (error) {
      console.error('OpenAI API test failed:', error.message);
    }
  }

  // Test YouTube API 
  if (process.env.YOUTUBE_API_KEY) {
    try {
      // Test with ytdl-core by getting info for a known video ID
      const ytdl = require('ytdl-core');
      await ytdl.getBasicInfo('dQw4w9WgXcQ');
      status.youtube = 'Connected';
    } catch (error) {
      console.error('YouTube API test failed:', error.message);
    }
  }

  res.json(status);
});

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});