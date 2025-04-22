import { io } from 'socket.io-client';

/**
 * Socket.io Test Utility
 * 
 * This utility is used to test the socket.io connection in the client app.
 * It connects to the test server and verifies the real-time updates.
 */

// Create a test socket connection
let testSocket = null;
let eventCallbacks = new Map();

// Debug logging
const DEBUG = true;
const log = (...args) => {
  if (DEBUG) {
    console.log('[SocketTest]', ...args);
  }
};

// Test socket events
export const SocketTestEvents = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECTION_ERROR: 'connect_error',
  AUDIO_PROGRESS: 'audioExtractionProgress',
  TRANSCRIPTION_PROGRESS: 'transcriptionProgress',
  CONNECTION_ESTABLISHED: 'connectionEstablished'
};

export const SocketTestUtil = {
  // Connect to the test server
  connect: (serverUrl = 'http://localhost:5001') => {
    if (testSocket) {
      log('Test socket already connected');
      return testSocket;
    }
    
    log('Connecting to test server at:', serverUrl);
    
    testSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    // Set up default event listeners
    testSocket.on('connect', () => {
      log('Connected to test server with ID:', testSocket.id);
      triggerCallbacks(SocketTestEvents.CONNECT, { id: testSocket.id });
    });
    
    testSocket.on('connect_error', (error) => {
      console.error('[SocketTest] Connection error:', error);
      triggerCallbacks(SocketTestEvents.CONNECTION_ERROR, error);
    });
    
    testSocket.on('disconnect', (reason) => {
      log('Disconnected from test server. Reason:', reason);
      triggerCallbacks(SocketTestEvents.DISCONNECT, { reason });
    });
    
    testSocket.on('connectionEstablished', (data) => {
      log('Connection established with test server:', data);
      triggerCallbacks(SocketTestEvents.CONNECTION_ESTABLISHED, data);
    });
    
    // Set up progress event listeners
    testSocket.on('audioExtractionProgress', (data) => {
      log('Received audio extraction progress update:', data);
      triggerCallbacks(SocketTestEvents.AUDIO_PROGRESS, data);
    });
    
    testSocket.on('transcriptionProgress', (data) => {
      log('Received transcription progress update:', data);
      triggerCallbacks(SocketTestEvents.TRANSCRIPTION_PROGRESS, data);
    });
    
    return testSocket;
  },
  
  // Start a test
  startTest: (options = {}) => {
    if (!testSocket) {
      log('No test socket connection, connecting now...');
      SocketTestUtil.connect();
    }
    
    if (!testSocket.connected) {
      log('Socket not connected, cannot start test');
      return false;
    }
    
    const testOptions = {
      testType: options.testType || 'both', // 'extraction', 'transcription', or 'both'
      duration: options.duration || 30       // seconds
    };
    
    log('Starting test with options:', testOptions);
    testSocket.emit('startTest', testOptions);
    return true;
  },
  
  // Register an event listener
  on: (event, callback) => {
    if (!eventCallbacks.has(event)) {
      eventCallbacks.set(event, []);
    }
    
    eventCallbacks.get(event).push(callback);
    log(`Registered callback for event: ${event}`);
    
    // Return function to remove the listener
    return () => {
      SocketTestUtil.off(event, callback);
    };
  },
  
  // Remove an event listener
  off: (event, callback) => {
    if (!eventCallbacks.has(event)) {
      return;
    }
    
    const callbacks = eventCallbacks.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
      log(`Removed callback for event: ${event}`);
    }
    
    if (callbacks.length === 0) {
      eventCallbacks.delete(event);
    }
  },
  
  // Check if connected to test server
  isConnected: () => {
    return testSocket && testSocket.connected;
  },
  
  // Get the socket ID
  getSocketId: () => {
    if (testSocket && testSocket.connected) {
      return testSocket.id;
    }
    return null;
  },
  
  // Disconnect from test server
  disconnect: () => {
    if (testSocket) {
      log('Disconnecting from test server');
      testSocket.disconnect();
      testSocket = null;
      eventCallbacks.clear();
    }
  }
};

// Helper function to trigger callbacks for an event
function triggerCallbacks(event, data) {
  if (!eventCallbacks.has(event)) {
    return;
  }
  
  const callbacks = eventCallbacks.get(event);
  callbacks.forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`[SocketTest] Error in callback for event ${event}:`, error);
    }
  });
}

export default SocketTestUtil; 