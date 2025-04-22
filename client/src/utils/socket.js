import { io } from 'socket.io-client';

// Create a socket connection
let socket = null;

export const socketService = {
  // Initialize socket connection
  connect: () => {
    if (!socket) {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:5000';
      
      socket = io(serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });
    }
    
    return socket;
  },
  
  // Subscribe to audio extraction progress updates
  subscribeToAudioProgress: (callback) => {
    if (!socket) {
      socketService.connect();
    }
    
    socket.on('audioExtractionProgress', (data) => {
      callback(data);
    });
    
    return () => {
      socket.off('audioExtractionProgress');
    };
  },
  
  // Subscribe to transcription progress updates
  subscribeToTranscriptionProgress: (callback) => {
    if (!socket) {
      socketService.connect();
    }
    
    socket.on('transcriptionProgress', (data) => {
      callback(data);
    });
    
    return () => {
      socket.off('transcriptionProgress');
    };
  },
  
  // Get socket ID (useful for sending with API requests)
  getSocketId: () => {
    if (!socket) {
      socketService.connect();
    }
    
    return socket.id;
  },
  
  // Disconnect socket
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
};

export default socketService; 