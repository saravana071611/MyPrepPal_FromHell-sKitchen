/**
 * MyPrepPal Server
 * 
 * Main server file for the MyPrepPal application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./api-routes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from temp directory (for development)
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// API routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('MyPrepPal API - Hell\'s Kitchen Edition');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});