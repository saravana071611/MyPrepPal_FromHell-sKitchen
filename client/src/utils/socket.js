import { io } from 'socket.io-client';

// Create a socket connection
let socket = null;
let connectionTestTimer = null;

// For debugging
const DEBUG = true;
const log = (...args) => {
  if (DEBUG) {
    console.log('[Socket]', ...args);
  }
};

export const socketService = {
  // Initialize socket connection
  connect: () => {
    if (!socket) {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:5000';
      
      log('Connecting to socket server at:', serverUrl);
      
      socket = io(serverUrl, {
        transports: ['websocket', 'polling'], // Try both transports
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      socket.on('connect', () => {
        log('Socket connected successfully with ID:', socket.id);
        
        // Test the connection immediately
        socketService.testConnection();
      });
      
      socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
        console.error('[Socket] Connection error details:', error.message);
      });
      
      socket.on('disconnect', (reason) => {
        log('Socket disconnected. Reason:', reason);
      });
      
      socket.on('reconnect', (attemptNumber) => {
        log('Socket reconnected after', attemptNumber, 'attempts');
      });
      
      socket.on('reconnect_attempt', (attemptNumber) => {
        log('Socket reconnection attempt #', attemptNumber);
      });
      
      socket.on('error', (error) => {
        console.error('[Socket] Error event:', error);
      });
      
      // Handle connection established confirmation
      socket.on('connectionEstablished', (data) => {
        log('Connection established confirmation received:', data);
      });
      
      // Handle ping-pong for connection heartbeat
      socket.on('ping', (data) => {
        log('Received ping from server:', data);
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });
      
      // Handle connection test response
      socket.on('connectionTestResponse', (data) => {
        log('Connection test response received:', data);
      });
      
      // Handle audio extraction messages even if not explicitly subscribed
      socket.on('audioExtractionProgress', (data) => {
        log('Received audioExtractionProgress event (global handler):', data);
      });
      
      // Handle transcription messages even if not explicitly subscribed
      socket.on('transcriptionProgress', (data) => {
        log('Received transcriptionProgress event (global handler):', data);
      });
      
      // Handle extraction progress events globally
      socket.on('extractionProgress', (data) => {
        log('Received extractionProgress event (global handler):', data);
      });
    } else {
      log('Socket already connected with ID:', socket.id);
    }
    
    return socket;
  },
  
  // Test the connection by sending a test event and expecting a response
  testConnection: () => {
    if (!socket) {
      log('No socket connection, connecting now before testing');
      socketService.connect();
    }
    
    if (socket && socket.connected) {
      log('Testing socket connection...');
      socket.emit('testConnection');
      
      // Set up a regular test if not already running
      if (!connectionTestTimer) {
        connectionTestTimer = setInterval(() => {
          if (socket && socket.connected) {
            log('Running periodic connection test');
            socket.emit('testConnection');
          }
        }, 60000); // Test connection every minute
      }
    } else {
      log('Socket not connected, cannot test');
    }
  },
  
  // Subscribe to audio extraction progress updates
  subscribeToAudioProgress: (callback) => {
    if (!socket) {
      log('No socket connection, connecting now before subscribing to audioExtractionProgress');
      socketService.connect();
    }
    
    if (socket) {
      log('Subscribing to audioExtractionProgress events');
      socket.on('audioExtractionProgress', (data) => {
        log('Received audioExtractionProgress event:', data);
        callback(data);
      });
    } else {
      console.warn('[Socket] Cannot subscribe to audioExtractionProgress: socket is null');
    }
    
    return () => {
      log('Unsubscribing from audioExtractionProgress events');
      if (socket) {
        socket.off('audioExtractionProgress');
      } else {
        log('Cannot unsubscribe: socket is null');
      }
    };
  },
  
  // Subscribe to transcription progress updates
  subscribeToTranscriptionProgress: (callback) => {
    if (!socket) {
      log('No socket connection, connecting now before subscribing to transcriptionProgress');
      socketService.connect();
    }
    
    if (socket) {
      log('Subscribing to transcriptionProgress events');
      socket.on('transcriptionProgress', (data) => {
        log('Received transcriptionProgress event:', data);
        callback(data);
      });
    } else {
      console.warn('[Socket] Cannot subscribe to transcriptionProgress: socket is null');
    }
    
    return () => {
      log('Unsubscribing from transcriptionProgress events');
      if (socket) {
        socket.off('transcriptionProgress');
      } else {
        log('Cannot unsubscribe: socket is null');
      }
    };
  },
  
  // Subscribe to extraction progress updates (combined process)
  subscribeToExtractionProgress: (callback) => {
    if (!socket) {
      log('No socket connection, connecting now before subscribing to extractionProgress');
      socketService.connect();
    }
    
    if (socket) {
      log('Subscribing to extractionProgress events');
      socket.on('extractionProgress', (data) => {
        log('Received extractionProgress event:', data);
        callback(data);
      });
    } else {
      console.warn('[Socket] Cannot subscribe to extractionProgress: socket is null');
    }
    
    return () => {
      log('Unsubscribing from extractionProgress events');
      if (socket) {
        socket.off('extractionProgress');
      } else {
        log('Cannot unsubscribe: socket is null');
      }
    };
  },
  
  // Start the extraction process via socket
  startExtractionProcess: (videoUrl) => {
    if (!socket) {
      log('No socket connection, connecting now before starting extraction process');
      socketService.connect();
    }
    
    if (!videoUrl) {
      console.error('[Socket] Cannot start extraction process: No video URL provided');
      return false;
    }
    
    if (socket && socket.connected) {
      log('Starting extraction process for URL:', videoUrl);
      socket.emit('startExtractionProcess', { videoUrl });
      return true;
    } else {
      console.warn('[Socket] Cannot start extraction process: socket is not connected');
      return false;
    }
  },
  
  // Get socket ID (useful for sending with API requests)
  getSocketId: () => {
    if (!socket) {
      log('No socket connection, connecting now to get socket ID');
      socketService.connect();
    }
    
    if (socket && socket.connected) {
      log('Current socket ID:', socket.id);
      return socket.id;
    } else {
      console.warn('[Socket] Trying to get ID but socket is not connected');
      return null;
    }
  },
  
  // Check connection status
  isConnected: () => {
    return socket && socket.connected;
  },
  
  // Disconnect socket
  disconnect: () => {
    // Clear the connection test timer if it exists
    if (connectionTestTimer) {
      log('Clearing connection test timer');
      clearInterval(connectionTestTimer);
      connectionTestTimer = null;
    }
    
    if (socket) {
      log('Disconnecting socket');
      
      try {
        // Try to disconnect safely
        socket.disconnect();
      } catch (error) {
        console.error('[Socket] Error while disconnecting:', error);
      }
      
      // Always null out the socket reference to prevent further issues
      socket = null;
    } else {
      log('Cannot disconnect: socket is already null');
    }
  }
};

export default socketService; 