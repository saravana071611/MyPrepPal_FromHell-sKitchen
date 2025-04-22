import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import '../styles/TestSocketPage.css';

const TestSocketPage = () => {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [extractionStatus, setExtractionStatus] = useState({
    inProgress: false,
    stage: '',
    progress: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    stages: []
  });
  const [extractionParams, setExtractionParams] = useState({
    duration: 10,
    stageCount: 5
  });

  const messagesEndRef = useRef(null);
  const eventsEndRef = useRef(null);

  // Connect to socket on component mount
  useEffect(() => {
    const socketInstance = io('http://localhost:5000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      addEvent('Connected to server');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
      addEvent('Disconnected from server');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error);
      addEvent(`Connection error: ${error.message}`);
    });

    socketInstance.on('serverMessage', (data) => {
      console.log('Server message:', data);
      addMessage(data.message);
    });

    // Extraction events
    socketInstance.on('extractionStart', (data) => {
      console.log('Extraction started:', data);
      setExtractionStatus({
        inProgress: true,
        stage: data.stages[0],
        progress: 0,
        elapsedTime: 0,
        estimatedTimeRemaining: data.expectedDuration,
        stages: data.stages
      });
      addEvent(`Extraction started with ${data.stages.length} stages`);
    });

    socketInstance.on('extractionProgress', (data) => {
      console.log('Extraction progress:', data);
      setExtractionStatus({
        inProgress: true,
        stage: data.stage,
        progress: data.progress,
        elapsedTime: data.elapsedTime,
        estimatedTimeRemaining: data.estimatedTimeRemaining,
        stages: extractionStatus.stages
      });
      addEvent(`Stage ${data.stageIndex + 1}/${data.totalStages}: ${data.stage} (${Math.round(data.progress)}%)`);
    });

    socketInstance.on('extractionComplete', (data) => {
      console.log('Extraction complete:', data);
      setExtractionStatus({
        inProgress: false,
        stage: 'Complete',
        progress: 100,
        elapsedTime: data.elapsedTime,
        estimatedTimeRemaining: 0,
        stages: extractionStatus.stages
      });
      addEvent(`Extraction completed in ${data.elapsedTime.toFixed(2)} seconds`);
      addMessage(`Extraction result: ${data.result.message}`);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Auto-scroll to the bottom of logs
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  const addMessage = (message) => {
    setMessages((prev) => [...prev, { text: message, timestamp: new Date() }]);
  };

  const addEvent = (event) => {
    setEvents((prev) => [...prev, { text: event, timestamp: new Date() }]);
  };

  const startTestExtraction = () => {
    if (socket && connected) {
      socket.emit('startTestExtraction', extractionParams);
      addEvent(`Requested test extraction (duration: ${extractionParams.duration}s, stages: ${extractionParams.stageCount})`);
    }
  };

  const handleParamChange = (e) => {
    const { name, value } = e.target;
    setExtractionParams((prev) => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="test-socket-container">
      <h1>Socket.IO Test Page</h1>
      
      <div className="connection-status">
        Status: <span className={connected ? 'connected' : 'disconnected'}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      <div className="extraction-controls">
        <h2>Test Extraction</h2>
        
        <div className="input-group">
          <label>
            Duration (seconds):
            <input
              type="number"
              name="duration"
              value={extractionParams.duration}
              onChange={handleParamChange}
              min="1"
              max="60"
              disabled={extractionStatus.inProgress}
            />
          </label>
          
          <label>
            Number of Stages:
            <input
              type="number"
              name="stageCount"
              value={extractionParams.stageCount}
              onChange={handleParamChange}
              min="1"
              max="7"
              disabled={extractionStatus.inProgress}
            />
          </label>
        </div>
        
        <button 
          onClick={startTestExtraction} 
          disabled={!connected || extractionStatus.inProgress}
        >
          Start Test Extraction
        </button>
      </div>
      
      {extractionStatus.inProgress && (
        <div className="extraction-status">
          <h3>Extraction in Progress</h3>
          <div className="status-details">
            <div>Current Stage: {extractionStatus.stage}</div>
            <div>Progress: {Math.round(extractionStatus.progress)}%</div>
            <div>Elapsed Time: {formatTime(extractionStatus.elapsedTime)}</div>
            <div>Est. Time Remaining: {formatTime(extractionStatus.estimatedTimeRemaining)}</div>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${extractionStatus.progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="logs-section">
        <div className="events-section">
          <h2>Events Log</h2>
          <div className="events-log">
            {events.length > 0 ? (
              events.map((event, index) => (
                <div key={index} className="event-item">
                  <span className="event-time">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="event-text">{event.text}</span>
                </div>
              ))
            ) : (
              <div className="no-events">No events yet</div>
            )}
            <div ref={eventsEndRef} />
          </div>
        </div>
        
        <div className="messages-section">
          <h2>Messages</h2>
          <div className="messages-log">
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <div key={index} className="message-item">
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="message-text">{message.text}</span>
                </div>
              ))
            ) : (
              <div className="no-messages">No messages yet</div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestSocketPage; 