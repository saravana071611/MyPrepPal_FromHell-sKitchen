/**
 * Socket.io Test Script
 * 
 * This script is used to test the socket.io connection and emulate the progress updates
 * for the recipe extractor. It will help debug the real-time updates issue.
 */

const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Create Express app and server
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors());

// Initialize Socket.IO with CORS settings
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Track connected clients
const connectedClients = new Map();

// Add debug logging
const debug = {
  log: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, ...args);
  },
  error: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, ...args);
  }
};

// Socket.IO connection handler
io.on('connection', (socket) => {
  debug.log(`Client connected with ID: ${socket.id}`);
  connectedClients.set(socket.id, { connected: Date.now() });
  
  // Send a welcome message
  socket.emit('connectionEstablished', { 
    message: 'Test socket server connected',
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });
  
  // Listen for test start request
  socket.on('startTest', (data) => {
    debug.log(`Received startTest request from ${socket.id}`, data);
    
    // Start the test sequence
    const testType = data?.testType || 'extraction';
    const duration = data?.duration || 30; // seconds
    
    if (testType === 'extraction') {
      runExtractionTest(socket, duration);
    } else if (testType === 'transcription') {
      runTranscriptionTest(socket, duration);
    } else {
      debug.log(`Running both test types for ${socket.id}`);
      runExtractionTest(socket, duration / 2);
      setTimeout(() => {
        runTranscriptionTest(socket, duration / 2);
      }, (duration / 2) * 1000);
    }
  });
  
  // Listen for disconnection
  socket.on('disconnect', () => {
    debug.log(`Client disconnected: ${socket.id}`);
    connectedClients.delete(socket.id);
  });
});

// Test audio extraction progress updates
function runExtractionTest(socket, duration = 30) {
  const stages = [
    { stage: 'initialized', progress: 0, message: 'Starting audio extraction...' },
    { stage: 'info', progress: 10, message: 'Fetching video information...' },
    { stage: 'download', progress: 20, message: 'Starting audio download...' },
    // Download progress from 20% to 80%
    { stage: 'processing', progress: 80, message: 'Processing audio file...' },
    // Processing progress from 80% to 100%
    { stage: 'completed', progress: 100, message: 'Audio extraction completed!' }
  ];
  
  debug.log(`Starting extraction test for ${socket.id}, duration: ${duration}s`);
  
  // Send initial stage
  socket.emit('audioExtractionProgress', stages[0]);
  
  // Calculate time intervals
  const stageInterval = Math.floor(duration * 1000 / (stages.length + 10)); // +10 for additional progress updates
  
  // Send the fixed stages
  stages.forEach((stage, index) => {
    setTimeout(() => {
      debug.log(`Sending extraction stage ${stage.stage} to ${socket.id}`);
      socket.emit('audioExtractionProgress', stage);
      
      // If it's the download stage, send intermediate progress updates
      if (stage.stage === 'download') {
        for (let progress = 25; progress < 80; progress += 10) {
          setTimeout(() => {
            const update = { 
              stage: 'download', 
              progress: 20 + (progress * 0.6), 
              message: `Downloading audio: ${progress}%` 
            };
            debug.log(`Sending extraction progress update ${progress}% to ${socket.id}`);
            socket.emit('audioExtractionProgress', update);
          }, (progress - 20) * stageInterval / 6);
        }
      }
      
      // If it's the processing stage, send intermediate progress updates
      if (stage.stage === 'processing') {
        for (let progress = 20; progress < 100; progress += 20) {
          setTimeout(() => {
            const update = { 
              stage: 'processing', 
              progress: 80 + (progress * 0.2), 
              message: `Processing audio: ${progress}%` 
            };
            debug.log(`Sending processing progress update ${progress}% to ${socket.id}`);
            socket.emit('audioExtractionProgress', update);
          }, progress * stageInterval / 5);
        }
      }
    }, index * stageInterval);
  });
}

// Test transcription progress updates
function runTranscriptionTest(socket, duration = 30) {
  const stages = [
    { stage: 'initialized', progress: 0, message: 'Starting transcription process...' },
    { stage: 'processing', progress: 40, message: 'Transcribing audio...' },
    { stage: 'processing', progress: 70, message: 'Transcribing audio...' },
    { stage: 'finalizing', progress: 90, message: 'Finalizing transcription...' },
    { stage: 'completed', progress: 100, message: 'Transcription complete!', transcript: 'This is a test transcript for debugging purposes.' }
  ];
  
  debug.log(`Starting transcription test for ${socket.id}, duration: ${duration}s`);
  
  // Calculate time intervals
  const interval = Math.floor(duration * 1000 / stages.length);
  
  // Send each stage with delay
  stages.forEach((stage, index) => {
    setTimeout(() => {
      debug.log(`Sending transcription stage ${stage.stage} to ${socket.id}`);
      socket.emit('transcriptionProgress', stage);
    }, interval * index);
  });
}

// Endpoint to check server status
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    clients: Array.from(connectedClients.entries()).map(([id, data]) => ({
      id,
      connectedSince: data.connected
    })),
    uptime: process.uptime()
  });
});

// Endpoint to manually trigger a test for a specific client
app.get('/trigger-test/:socketId', (req, res) => {
  const { socketId } = req.params;
  const { type = 'both', duration = 30 } = req.query;
  
  const clientSocket = io.sockets.sockets.get(socketId);
  
  if (!clientSocket) {
    return res.status(404).json({ error: `Client ${socketId} not found` });
  }
  
  debug.log(`Manually triggering ${type} test for ${socketId}`);
  
  if (type === 'extraction' || type === 'both') {
    runExtractionTest(clientSocket, parseInt(duration, 10));
  }
  
  if (type === 'transcription' || type === 'both') {
    const delay = type === 'both' ? parseInt(duration, 10) * 1000 / 2 : 0;
    setTimeout(() => {
      runTranscriptionTest(clientSocket, parseInt(duration, 10));
    }, delay);
  }
  
  res.json({ 
    message: `Test started for client ${socketId}`, 
    type, 
    duration: parseInt(duration, 10)
  });
});

// Start the server
const PORT = process.env.TEST_PORT || 5001;
server.listen(PORT, () => {
  debug.log(`Test socket server running on port ${PORT}`);
  debug.log(`View connected clients at http://localhost:${PORT}/status`);
  debug.log(`Trigger a test by visiting http://localhost:${PORT}/trigger-test/SOCKET_ID?type=both&duration=30`);
}); 