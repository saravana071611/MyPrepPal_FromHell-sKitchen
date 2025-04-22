import axios from 'axios';
import { socketService } from './socket';

// Create a custom axios instance with enhanced configuration
const api = axios.create({
  baseURL: '/',
  timeout: 60000, // 60 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Debug flag
const DEBUG = true;
const log = (...args) => {
  if (DEBUG) {
    console.log('[API]', ...args);
  }
};

// Define server port - kept consistent with proxy setting in package.json
const SERVER_PORT = 5000;

// Determine if we should retry the request
const shouldRetry = (error) => {
  // Retry on network errors or 5xx errors
  return (
    error.code === 'ECONNRESET' || 
    error.code === 'ETIMEDOUT' || 
    error.code === 'ECONNABORTED' ||
    (error.response && error.response.status >= 500)
  );
};

// Add request interceptor
api.interceptors.request.use(
  config => {
    // You can add authorization headers here if needed
    
    // Add custom timeout from environment if available
    if (process.env.REACT_APP_API_TIMEOUT) {
      config.timeout = parseInt(process.env.REACT_APP_API_TIMEOUT, 10);
    }
    
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor with retry logic
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If this is an ECONNRESET or network error and we haven't retried yet
    if (shouldRetry(error) && !originalRequest._retry) {
      log(`API request failed with ${error.code || 'unknown error'}, retrying...`);
      
      // Mark as retried and increase timeout
      originalRequest._retry = true;
      originalRequest.timeout = originalRequest.timeout * 1.5; // Increase timeout by 50%
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Retry the request
      return api(originalRequest);
    }
    
    // If it's a specific OpenAI error, provide more helpful message
    if (error.response && 
        error.response.data && 
        error.response.data.details && 
        error.response.data.details.includes('OpenAI API error')) {
      console.error('OpenAI API error:', error.response.data.details);
      
      // You could add specific handling for different OpenAI errors here
    }
    
    return Promise.reject(error);
  }
);

// Helper function to ensure we have a socket connection before making requests
const ensureSocketConnection = () => {
  if (!socketService.isConnected()) {
    log('No active socket connection, connecting now...');
    socketService.connect();
    
    // Give it a short moment to connect
    return new Promise(resolve => {
      setTimeout(() => {
        const socketId = socketService.getSocketId();
        log('Socket ID after connection attempt:', socketId);
        resolve(socketId);
      }, 500);
    });
  }
  
  return Promise.resolve(socketService.getSocketId());
};

// API utility methods
export const apiClient = {
  // OpenAI API calls
  getFitnessAssessment: (userData) => {
    return api.post('/api/openai/fitness-assessment', userData, {
      timeout: 90000 // 90 seconds for potentially long OpenAI calls
    });
  },
  
  getRecipeAnalysis: (data) => {
    console.log('Calling recipe analysis with data:', data);
    return api.post('/api/openai/recipe-analysis', data, {
      timeout: 120000 // 2 minutes for potentially long OpenAI calls
    }).catch(error => {
      console.error('Recipe analysis API error:', error);
      // Add additional information to the error
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      } else if (error.request) {
        console.error('No response received from server');
      } else {
        console.error('Error setting up request:', error.message);
      }
      throw error; // Re-throw for component to handle
    });
  },
  
  transcribeAudio: async (data) => {
    // Ensure we have a socket connection and get the socket ID
    const socketId = await ensureSocketConnection();
    log('Using socket ID for transcription:', socketId);
    
    // Include socket ID in the request for real-time progress updates
    return api.post('/api/openai/transcribe', 
      { 
        ...data,
        socketId
      }, 
      {
        timeout: 120000 // 2 minutes for transcription
      }
    );
  },
  
  // YouTube API calls
  getVideoInfo: (videoUrl) => {
    return api.get(`/api/youtube/video-info?videoUrl=${encodeURIComponent(videoUrl)}`, {
      timeout: 30000 // 30 second timeout for YouTube info requests
    });
  },
  
  extractAudio: async (videoUrl) => {
    // Ensure we have a socket connection and get the socket ID
    const socketId = await ensureSocketConnection();
    log('Using socket ID for audio extraction:', socketId);
    
    return api.post('/api/youtube/extract-audio', 
      { 
        videoUrl,
        socketId // Include socket ID so server can send progress updates
      }, 
      {
        timeout: 180000 // 3 minutes for audio extraction
      }
    );
  },
  
  // Combined extraction and transcription in one request
  extractAndTranscribe: async (videoUrl) => {
    // Ensure we have a socket connection and get the socket ID
    const socketId = await ensureSocketConnection();
    log('Using socket ID for combined extraction and transcription:', socketId);
    
    return api.post('/api/youtube/extract-and-transcribe', 
      { 
        videoUrl,
        socketId // Include socket ID so server can send progress updates
      }, 
      {
        timeout: 300000 // 5 minutes for the entire process
      }
    );
  },
  
  // User profile API calls
  getUserProfile: (userId) => {
    return api.get(`/api/user/profile/${userId}`);
  },
  
  saveUserProfile: (userData) => {
    return api.post('/api/user/profile', userData);
  },
  
  // Server status check
  getApiStatus: () => {
    return api.get('/api/status');
  }
};

export default apiClient; 