const socketIo = require('socket.io');

// Function to initialize Socket.IO with a given HTTP server
function initializeSocketIO(server) {
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  console.log('Socket.IO initialized');

  // Keep track of connected clients
  const connectedClients = new Map();

  // Handle connection event
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Add to connected clients
    connectedClients.set(socket.id, {
      id: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Emit welcome message to client
    socket.emit('serverMessage', {
      message: 'Connected to server socket',
      timestamp: new Date().toISOString()
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      connectedClients.delete(socket.id);
    });

    // Handle connection test
    socket.on('testConnection', () => {
      console.log(`Received test connection request from ${socket.id}`);
      updateClientActivity(socket.id);
      
      socket.emit('connectionTestResponse', {
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Connection test successful'
      });
    });

    // Handle recipe extraction process event
    socket.on('startExtractionProcess', async (data) => {
      console.log(`Received extraction process request from ${socket.id}`, data);
      updateClientActivity(socket.id);
      
      const { videoUrl } = data;
      
      if (!videoUrl) {
        socket.emit('extractionProgress', {
          stage: 'error',
          progress: 0,
          message: 'No video URL provided'
        });
        return;
      }
      
      // Emit initial stage
      socket.emit('extractionProgress', {
        stage: 'initialized',
        progress: 0,
        message: 'Starting extraction process...'
      });
      
      try {
        // Make API request to extract audio and transcribe
        // This is just for validation - the actual process will be handled by the API route
        const axios = require('axios');
        const serverUrl = process.env.NODE_ENV === 'production'
          ? 'http://localhost:5000' // Would be different in production
          : 'http://localhost:5000';
          
        await axios.post(`${serverUrl}/api/youtube/extract-and-transcribe`, {
          videoUrl,
          socketId: socket.id
        });
        
        console.log('Extraction process request sent successfully');
      } catch (error) {
        console.error('Error starting extraction process:', error);
        socket.emit('extractionProgress', {
          stage: 'error',
          progress: 0,
          message: `Error: ${error.message || 'Failed to start extraction process'}`
        });
      }
    });

    // Handle test extraction event (simulated for testing)
    socket.on('startTestExtraction', (data) => {
      console.log(`Received test extraction request from ${socket.id}`, data);
      updateClientActivity(socket.id);
      
      const { duration = 10, stageCount = 5 } = data;
      simulateExtraction(socket, duration, stageCount);
    });
    
    // Handle YouTube audio extraction test
    socket.on('startYouTubeExtraction', (data) => {
      console.log(`Received YouTube extraction request from ${socket.id}`, data);
      updateClientActivity(socket.id);
      
      const { videoUrl } = data;
      
      // Emit initial stage
      socket.emit('audioExtractionProgress', {
        stage: 'initialized',
        progress: 0,
        message: 'Starting YouTube audio extraction test...'
      });
      
      // Simulate YouTube extraction process
      simulateYouTubeExtraction(socket, videoUrl);
    });
  });

  // Helper function to update client activity timestamp
  function updateClientActivity(socketId) {
    if (connectedClients.has(socketId)) {
      const clientInfo = connectedClients.get(socketId);
      clientInfo.lastActivity = new Date();
      connectedClients.set(socketId, clientInfo);
    }
  }

  // Set up regular client check
  setInterval(() => {
    const now = new Date();
    
    // Log connected clients for monitoring
    if (connectedClients.size > 0) {
      console.log(`${connectedClients.size} clients connected`);
    }
    
    // Check for inactive clients (inactive for more than 30 minutes)
    for (const [socketId, clientInfo] of connectedClients.entries()) {
      const inactiveTime = now - clientInfo.lastActivity;
      const inactiveMinutes = Math.floor(inactiveTime / 60000);
      
      if (inactiveMinutes > 30) {
        console.log(`Client ${socketId} inactive for ${inactiveMinutes} minutes, checking status`);
        
        // Try to send a ping to check if still connected
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('ping', { timestamp: now.toISOString() });
        } else {
          // Socket no longer exists, remove from tracking
          console.log(`Removing inactive client ${socketId} from tracking`);
          connectedClients.delete(socketId);
        }
      }
    }
  }, 600000); // Every 10 minutes

  return io;
}

// Function to simulate an extraction process
function simulateExtraction(socket, totalDuration, stageCount) {
  // Define extraction stages
  const stages = [
    'Initializing extraction process',
    'Downloading video information',
    'Extracting audio from video',
    'Processing audio file',
    'Transcribing audio content',
    'Analyzing content',
    'Finalizing extraction'
  ];

  // Use available stages based on stageCount
  const useStages = stages.slice(0, Math.min(stageCount, stages.length));
  
  // Calculate time per stage
  const timePerStage = totalDuration * 1000 / useStages.length;
  
  // Track start time
  const startTime = Date.now();
  
  // Emit start event
  socket.emit('extractionStart', {
    stages: useStages,
    expectedDuration: totalDuration,
    timestamp: new Date().toISOString()
  });

  // Process each stage
  useStages.forEach((stage, index) => {
    // Calculate delay for this stage
    const stageDelay = index * timePerStage;
    
    // Schedule stage update
    setTimeout(() => {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const progress = (index + 1) / useStages.length;
      const estimatedTimeRemaining = elapsedTime / progress - elapsedTime;
      
      // Emit progress update
      socket.emit('extractionProgress', {
        stage,
        stageIndex: index,
        totalStages: useStages.length,
        progress: progress * 100,
        elapsedTime,
        estimatedTimeRemaining,
        timestamp: new Date().toISOString()
      });
      
      // If this is the last stage, schedule completion
      if (index === useStages.length - 1) {
        // Add a small delay to simulate final processing
        setTimeout(() => {
          const totalElapsedTime = (Date.now() - startTime) / 1000;
          
          // Emit completion event
          socket.emit('extractionComplete', {
            success: true,
            stages: useStages,
            elapsedTime: totalElapsedTime,
            timestamp: new Date().toISOString(),
            result: {
              message: 'Test extraction completed successfully',
              testData: {
                id: `test-${Date.now()}`,
                processingTime: totalElapsedTime
              }
            }
          });
        }, 500);
      }
    }, stageDelay);
  });
}

// Function to simulate YouTube audio extraction
function simulateYouTubeExtraction(socket, videoUrl) {
  // Define extraction stages with timing
  const stages = [
    { name: 'info', progress: 10, message: 'Fetching video information...', delay: 1000 },
    { name: 'download', progress: 20, message: 'Starting audio download...', delay: 1000 },
    // Download progress updates
    { name: 'download', progress: 30, message: 'Downloading audio: 25%', delay: 1000 },
    { name: 'download', progress: 40, message: 'Downloading audio: 50%', delay: 1500 },
    { name: 'download', progress: 50, message: 'Downloading audio: 75%', delay: 1000 },
    { name: 'download', progress: 60, message: 'Downloading audio: 90%', delay: 1000 },
    { name: 'processing', progress: 80, message: 'Processing audio file...', delay: 2000 },
    // Processing updates
    { name: 'processing', progress: 90, message: 'Processing audio: 50%', delay: 1000 },
    { name: 'processing', progress: 95, message: 'Processing audio: 90%', delay: 1000 },
    { name: 'completed', progress: 100, message: 'Audio extraction completed!', delay: 0 }
  ];
  
  // Track start time
  const startTime = Date.now();
  
  // Process each stage with appropriate delays
  let cumulativeDelay = 0;
  
  stages.forEach((stage, index) => {
    cumulativeDelay += stage.delay;
    
    setTimeout(() => {
      console.log(`Emitting YouTube extraction progress: ${stage.name} (${stage.progress}%)`);
      
      // Add video details to first stage
      const stageData = { ...stage };
      if (index === 0) {
        stageData.title = `YouTube Video - ${videoUrl}`;
        stageData.lengthSeconds = 180;
      }
      
      // Add audio path to completion stage
      if (stage.name === 'completed') {
        stageData.audioPath = `/temp/simulated_audio_${Date.now()}.mp3`;
      }
      
      // Emit progress update
      socket.emit('audioExtractionProgress', stageData);
    }, cumulativeDelay);
  });
}

module.exports = { initializeSocketIO }; 