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
app.get('/api/status', (req, res) => {
  const status = {
    openai: process.env.OPENAI_API_KEY ? 'Connected' : 'Disconnected',
    youtube: process.env.YOUTUBE_API_KEY ? 'Connected' : 'Disconnected'
  };
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