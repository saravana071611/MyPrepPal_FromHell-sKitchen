const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initializeSocketIO } = require('./socket');

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

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Server time: ${new Date().toISOString()}`);
  console.log(`Socket.IO test page available at http://localhost:${port}`);
}); 