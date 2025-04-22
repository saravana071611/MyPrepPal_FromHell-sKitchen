import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../utils/socket';
import axios from 'axios';
import '../styles/TestSocketPage.css';

const YouTubeAudioExtractor = () => {
  const [connected, setConnected] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [extractionStatus, setExtractionStatus] = useState({
    inProgress: false,
    stage: '',
    progress: 0,
    message: '',
    error: null,
    audioPath: null,
    title: ''
  });
  const [logs, setLogs] = useState([]);
  
  const logsEndRef = useRef(null);

  // Connect to socket on component mount
  useEffect(() => {
    // Initialize socket connection
    const socket = socketService.connect();
    
    // Setup socket connection monitoring
    const connectionCheckInterval = setInterval(() => {
      setConnected(socketService.isConnected());
      if (socketService.isConnected() && !connected) {
        addLog('Connected to server socket');
      } else if (!socketService.isConnected() && connected) {
        addLog('Disconnected from server socket');
      }
    }, 1000);
    
    // Subscribe to audio extraction progress updates
    const unsubscribeProgress = socketService.subscribeToAudioProgress((data) => {
      addLog(`Progress update: ${data.stage} - ${data.message} (${Math.round(data.progress)}%)`);
      
      setExtractionStatus(prev => ({
        ...prev,
        inProgress: data.stage !== 'completed' && data.stage !== 'error',
        stage: data.stage,
        progress: data.progress,
        message: data.message,
        error: data.stage === 'error' ? data.message : null,
        title: data.title || prev.title,
        audioPath: data.audioPath || prev.audioPath
      }));
    });
    
    // Check initial connection status
    setConnected(socketService.isConnected());
    if (socketService.isConnected()) {
      addLog('Connected to server socket');
    }
    
    // Clean up socket listeners on unmount
    return () => {
      clearInterval(connectionCheckInterval);
      unsubscribeProgress();
    };
  }, [connected]);
  
  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  // Add a log entry
  const addLog = (message) => {
    setLogs(prev => [...prev, {
      text: message,
      timestamp: new Date()
    }]);
  };
  
  // Start audio extraction via the API
  const startExtraction = async () => {
    if (!videoUrl) {
      addLog('Error: Please enter a YouTube URL');
      return;
    }
    
    try {
      // Reset status
      setExtractionStatus({
        inProgress: true,
        stage: 'initializing',
        progress: 0,
        message: 'Starting audio extraction...',
        error: null,
        audioPath: null,
        title: ''
      });
      
      addLog(`Starting extraction for: ${videoUrl}`);
      
      // Get socket ID for real-time updates
      const socketId = socketService.getSocketId();
      
      // Make API request to start extraction
      const response = await axios.post('/api/youtube/extract-audio', {
        videoUrl,
        socketId
      });
      
      addLog(`API Response: ${response.data.message}`);
      
      if (response.data.success) {
        setExtractionStatus(prev => ({
          ...prev,
          audioPath: response.data.audioPath,
          title: response.data.title || 'Unknown title'
        }));
      } else {
        setExtractionStatus(prev => ({
          ...prev,
          inProgress: false,
          error: response.data.error || 'Extraction failed with unknown error'
        }));
      }
    } catch (error) {
      console.error('Extraction request failed:', error);
      addLog(`Error: ${error.message || 'Unknown error occurred'}`);
      
      setExtractionStatus(prev => ({
        ...prev,
        inProgress: false,
        stage: 'error',
        progress: 0,
        error: error.message || 'Failed to start extraction'
      }));
    }
  };
  
  // Test function to simulate extraction via direct socket event
  const testExtraction = () => {
    if (!videoUrl) {
      addLog('Error: Please enter a YouTube URL');
      return;
    }
    
    if (!socketService.isConnected()) {
      addLog('Error: Socket not connected');
      return;
    }
    
    // Reset status
    setExtractionStatus({
      inProgress: true,
      stage: 'initializing',
      progress: 0,
      message: 'Starting test extraction...',
      error: null,
      audioPath: null,
      title: ''
    });
    
    addLog(`Starting test extraction for: ${videoUrl}`);
    
    // Get the socket instance
    const socket = socketService.connect();
    
    // Emit the test event
    socket.emit('startYouTubeExtraction', { videoUrl });
  };
  
  // Handle input change
  const handleUrlChange = (e) => {
    setVideoUrl(e.target.value);
  };
  
  // Format stage name for display
  const formatStageName = (stage) => {
    if (!stage) return '';
    
    // Convert camelCase or snake_case to Title Case with spaces
    return stage
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
      .trim();
  };
  
  return (
    <div className="test-socket-container">
      <h1>YouTube Audio Extractor Test</h1>
      
      <div className="connection-status">
        Socket Status: <span className={connected ? 'connected' : 'disconnected'}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      <div className="extraction-controls">
        <h2>Extract Audio</h2>
        
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter YouTube URL"
            value={videoUrl}
            onChange={handleUrlChange}
            disabled={extractionStatus.inProgress}
          />
          
          <button 
            onClick={startExtraction} 
            disabled={!connected || extractionStatus.inProgress || !videoUrl}
          >
            {extractionStatus.inProgress ? 'Extracting...' : 'Extract Audio'}
          </button>
          
          <button 
            onClick={testExtraction} 
            disabled={!connected || extractionStatus.inProgress || !videoUrl}
            className="test-button"
          >
            Test Simulation
          </button>
        </div>
      </div>
      
      {(extractionStatus.inProgress || extractionStatus.audioPath) && (
        <div className="extraction-status">
          <h3>
            {extractionStatus.title ? 
              `Processing: ${extractionStatus.title}` : 
              'Extraction in Progress'}
          </h3>
          
          <div className="status-details">
            {extractionStatus.stage && (
              <div>Status: {formatStageName(extractionStatus.stage)}</div>
            )}
            
            {extractionStatus.message && (
              <div>Message: {extractionStatus.message}</div>
            )}
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${extractionStatus.progress}%` }}
            ></div>
          </div>
          
          {extractionStatus.audioPath && !extractionStatus.inProgress && (
            <div className="success-message">
              <p>Audio extraction completed successfully!</p>
              <p>Audio file path: {extractionStatus.audioPath}</p>
            </div>
          )}
          
          {extractionStatus.error && (
            <div className="error-message">
              Error: {extractionStatus.error}
            </div>
          )}
        </div>
      )}
      
      <div className="logs-section">
        <h2>Event Log</h2>
        <div className="events-log">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="event-item">
                <span className="event-time">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className="event-text">{log.text}</span>
              </div>
            ))
          ) : (
            <div className="no-events">No events yet</div>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default YouTubeAudioExtractor; 