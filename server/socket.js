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

  // Handle connection event
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Emit welcome message to client
    socket.emit('serverMessage', {
      message: 'Connected to server socket',
      timestamp: new Date().toISOString()
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });

    // Handle test extraction event
    socket.on('startTestExtraction', (data) => {
      console.log(`Received test extraction request from ${socket.id}`, data);
      const { duration = 10, stageCount = 5 } = data;
      
      simulateExtraction(socket, duration, stageCount);
    });
  });

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

module.exports = { initializeSocketIO }; 