import axios from 'axios';

// Create a custom axios instance with enhanced configuration
const api = axios.create({
  baseURL: '/',
  timeout: 60000, // 60 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

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
      console.log(`API request failed with ${error.code || 'unknown error'}, retrying...`);
      
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

// API utility methods
export const apiClient = {
  // OpenAI API calls
  getFitnessAssessment: (userData) => {
    return api.post('/api/openai/fitness-assessment', userData, {
      timeout: 90000 // 90 seconds for potentially long OpenAI calls
    });
  },
  
  getRecipeAnalysis: (data) => {
    return api.post('/api/openai/recipe-analysis', data, {
      timeout: 90000 // 90 seconds for potentially long OpenAI calls
    });
  },
  
  transcribeAudio: (data) => {
    return api.post('/api/openai/transcribe', data, {
      timeout: 120000 // 2 minutes for transcription
    });
  },
  
  // YouTube API calls
  getVideoInfo: (videoUrl) => {
    return api.get(`/api/youtube/video-info?videoUrl=${encodeURIComponent(videoUrl)}`);
  },
  
  extractAudio: (videoUrl) => {
    return api.post('/api/youtube/extract-audio', { videoUrl }, {
      timeout: 120000 // 2 minutes for audio extraction
    });
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