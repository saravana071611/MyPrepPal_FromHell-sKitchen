const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Create an Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Serve static test page
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'socket-test.html'));
});

// Socket event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Emit a welcome message
  socket.emit('serverMessage', {
    type: 'info',
    message: 'Connected to socket test server'
  });
  
  // Handle test extraction request
  socket.on('startTestExtraction', (data) => {
    console.log('Received startTestExtraction:', data);
    
    // Send acknowledgment
    socket.emit('serverMessage', {
      type: 'info',
      message: `Starting test extraction for: ${data.videoUrl || 'test video'}`
    });
    
    // Simulate extraction process
    simulateExtractionProcess(socket, data.videoUrl);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Function to simulate the extraction process with socket events
function simulateExtractionProcess(socket, videoUrl) {
  const stages = [
    { name: 'STARTING', message: 'Starting extraction process', percentage: 5 },
    { name: 'FETCHING_INFO', message: 'Fetching video information', percentage: 10 },
    { name: 'CREATING_STREAM', message: 'Creating download stream', percentage: 15 },
    { name: 'DOWNLOADING', message: 'Downloading audio', percentage: 30 },
    { name: 'PROCESSING', message: 'Processing audio with ffmpeg', percentage: 60 },
    { name: 'VERIFYING', message: 'Verifying output file', percentage: 90 },
    { name: 'COMPLETED', message: 'Extraction completed successfully', percentage: 100 }
  ];
  
  let currentStage = 0;
  
  // Emit initial stage
  emitStage(stages[currentStage]);
  
  // Schedule the stages with delays to simulate real processing
  const stageInterval = setInterval(() => {
    currentStage++;
    
    if (currentStage < stages.length) {
      emitStage(stages[currentStage]);
      
      // Simulate detailed progress updates for downloading and processing stages
      if (stages[currentStage].name === 'DOWNLOADING' || stages[currentStage].name === 'PROCESSING') {
        simulateDetailedProgress(stages[currentStage].name, 
                               stages[currentStage-1].percentage, 
                               stages[currentStage].percentage);
      }
    } else {
      // End of process - send completion
      socket.emit('extractionComplete', {
        success: true,
        filePath: `/temp/simulated_audio_${Date.now()}.mp3`,
        message: 'Extraction successfully completed'
      });
      
      clearInterval(stageInterval);
    }
  }, 3000); // 3 seconds between major stages
  
  // Function to emit a stage update
  function emitStage(stage) {
    socket.emit('extractionProgress', {
      stage: stage.name,
      message: stage.message,
      progress: stage.percentage
    });
    
    console.log(`Emitted stage: ${stage.name} (${stage.percentage}%)`);
  }
  
  // Function to simulate detailed progress updates during a stage
  function simulateDetailedProgress(stageName, startPercentage, endPercentage) {
    const totalUpdates = 10;
    const percentageStep = (endPercentage - startPercentage) / totalUpdates;
    let updateCount = 0;
    
    const progressInterval = setInterval(() => {
      updateCount++;
      
      if (updateCount < totalUpdates) {
        const currentPercentage = startPercentage + (percentageStep * updateCount);
        
        socket.emit('extractionProgress', {
          stage: stageName,
          message: `${stageName} in progress...`,
          progress: Math.round(currentPercentage)
        });
        
        console.log(`Emitted progress update: ${stageName} (${Math.round(currentPercentage)}%)`);
      } else {
        clearInterval(progressInterval);
      }
    }, 500); // Send update every 500ms
  }
}

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Socket test server running on port ${PORT}`);
  console.log(`Test page available at http://localhost:${PORT}`);
}); 