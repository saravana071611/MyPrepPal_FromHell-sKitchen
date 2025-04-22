import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../utils/api';
import { socketService } from '../utils/socket';
import '../styles/RecipeExtractorPage.css';

// Format time in minutes and seconds
const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return '...';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Debug flag
const DEBUG = true;
const log = (...args) => {
  if (DEBUG) {
    console.log('[RecipeExtractor]', ...args);
  }
};

// Processing status component to show timer and progress
const ProcessingStatus = ({ 
  processingStage, 
  elapsedTime, 
  estimatedTimeRemaining, 
  progressPercent 
}) => {
  // Add descriptive messages for each processing stage
  const stageDescriptions = {
    'fetching': 'Fetching video data from YouTube...',
    'extracting': 'Extracting and processing the video transcript...',
    'analyzing': 'Analyzing recipe content with AI...',
    'formatting': 'Formatting the recipe for display...',
    'Preparing to extract audio': 'Setting up audio extraction process...',
    'Fetching video information': 'Getting video details from YouTube...',
    'Downloading audio from YouTube': 'Downloading audio stream from the video...',
    'Processing audio file': 'Converting audio to the right format...',
    'Audio extraction complete': 'Successfully extracted audio from video!',
    'Starting transcription': 'Preparing to convert speech to text...',
    'Transcribing audio': 'Converting speech to text using AI...',
    'Finalizing transcription': 'Completing the transcription process...',
    'Transcription complete': 'Successfully transcribed the audio to text!'
  };

  // Get the description or use a default message
  const stageDescription = stageDescriptions[processingStage] || 'Processing your request...';
  
  // Format stage for display, handling undefined case
  const displayStage = processingStage 
    ? processingStage.charAt(0).toUpperCase() + processingStage.slice(1)
    : 'Processing';
  
  return (
    <div className="processing-status">
      <div className="progress-info">
        <div className="stage-info">
          <span className="stage-label">Current Stage:</span>
          <span className="stage-value">{displayStage}</span>
        </div>
        <div className="stage-description">
          {stageDescription}
        </div>
        <div className="time-info">
          <div className="elapsed-time">
            <span className="time-label">Elapsed:</span>
            <span className="time-value">{formatTime(elapsedTime)}</span>
          </div>
          {estimatedTimeRemaining > 0 && (
            <div className="remaining-time">
              <span className="time-label">Estimated Time Remaining:</span>
              <span className="time-value">{formatTime(estimatedTimeRemaining)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${progressPercent}%` }}
          aria-valuenow={progressPercent}
          aria-valuemin="0"
          aria-valuemax="100"
          role="progressbar"
        ></div>
      </div>
    </div>
  );
};

// Define a more helpful error component
const ErrorDisplay = ({ message }) => {
  // Check if it's a YouTube-specific error
  const isYouTubeError = message.includes('YouTube') || message.includes('video');
  
  return (
    <div className="error-message">
      <div className="error-title">
        {isYouTubeError ? 'YouTube Video Error' : 'Error'}
      </div>
      <div className="error-content">
        <p>{message}</p>
        
        {isYouTubeError && (
          <div className="error-help">
            <p>Try these troubleshooting steps:</p>
            <ul>
              <li>Check that the video URL is correct and complete</li>
              <li>Make sure the video is publicly available (not private or unlisted)</li>
              <li>Try a different YouTube recipe video</li>
              <li>Refresh the page and try again</li>
            </ul>
            <p>Recommended example: <a href="https://www.youtube.com/watch?v=Cyskqnp1j64" target="_blank" rel="noopener noreferrer">Gordon Ramsay's Recipe</a></p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to validate and clean YouTube URLs
const validateYouTubeUrl = (url) => {
  // Basic URL validation
  if (!url) return { valid: false, reason: 'Empty URL' };
  
  // Check for YouTube domain
  if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
    return { valid: false, reason: 'Not a YouTube URL' };
  }
  
  // Try to extract video ID using regex patterns
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i, // Standard
    /youtube\.com\/shorts\/([^"&?\/\s]{11})/i, // Shorts
    /youtube\.com\/watch\?v=([^"&?\/\s]{11})/i, // Direct watch
    /youtu\.be\/([^"&?\/\s]{11})/i // Short URLs
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      // Found a valid video ID
      const videoId = match[1];
      // Return cleaned URL in standard format
      return { 
        valid: true, 
        videoId, 
        cleanUrl: `https://www.youtube.com/watch?v=${videoId}`
      };
    }
  }
  
  return { valid: false, reason: 'Could not extract video ID' };
};

// Helper function to format duration nicely
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) return 'Unknown duration';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min ${remainingSeconds} sec`;
  } else {
    return `${minutes} min ${remainingSeconds} sec`;
  }
};

// Helper function to format view count with thousands separator
const formatViews = (viewCount) => {
  if (!viewCount || isNaN(viewCount)) return 'Unknown views';
  
  if (viewCount === 0) {
    return 'No views';
  }
  
  // Format with locale thousands separator
  return viewCount.toLocaleString() + ' views';
};

const RecipeExtractorPage = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [recipeAnalysis, setRecipeAnalysis] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const userId = localStorage.getItem('userId') || null;
  
  // New state variables for timer and processing feedback
  const [processStartTime, setProcessStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [processingStage, setProcessingStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const timerRef = useRef(null);

  // Add a new state to track socket subscription
  const [socketSubscribed, setSocketSubscribed] = useState(false);

  // Function to start the processing timer
  const startProcessingTimer = (estimatedSeconds, initialStage) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const startTime = Date.now();
    setProcessStartTime(startTime);
    setElapsedTime(0);
    setEstimatedTimeRemaining(estimatedSeconds);
    setProcessingStage(initialStage);
    setProgressPercent(0);
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedSecs = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsedSecs);
      
      if (estimatedSeconds) {
        const remaining = Math.max(0, estimatedSeconds - elapsedSecs);
        setEstimatedTimeRemaining(remaining);
        
        // Calculate progress percentage (capped at 95% until complete)
        const percent = Math.min(95, (elapsedSecs / estimatedSeconds) * 100);
        setProgressPercent(percent);
      }
    }, 1000);
  };

  // Function to update processing stage
  const updateProcessingStage = (stage, percentComplete) => {
    log('Stage update:', stage, 'Progress:', percentComplete);
    setProcessingStage(stage);
    if (percentComplete !== undefined) setProgressPercent(percentComplete);
  };

  // Function to stop the timer
  const stopProcessingTimer = (completed = false) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (completed) {
      setProgressPercent(100);
    }
  };

  // Clean up timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Load user profile if available
  const loadUserProfile = async () => {
    if (!userId) return;
    
    try {
      const response = await apiClient.getUserProfile(userId);
      setUserProfile(response.data);
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Continue without profile
    }
  };

  // Load profile on component mount
  useEffect(() => {
    loadUserProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Handle video URL input
  const handleVideoUrlChange = (e) => {
    setVideoUrl(e.target.value);
  };

  // Fetch video info with retry capability
  const fetchVideoInfo = async (retryCount = 0) => {
    setLoading(true);
    setError('');
    
    // Start timer with short estimated time (10 seconds for video info fetch)
    startProcessingTimer(10, 'Fetching video information');
    
    // Validate and clean the YouTube URL
    const validation = validateYouTubeUrl(videoUrl);
    if (!validation.valid) {
      setError(`Invalid YouTube URL: ${validation.reason}. Please enter a valid YouTube video URL.`);
      setLoading(false);
      stopProcessingTimer();
      return;
    }
    
    // Use the cleaned URL
    const cleanedUrl = validation.cleanUrl;
    console.log(`Using cleaned URL: ${cleanedUrl} (ID: ${validation.videoId})`);
    
    try {
      console.log(`Attempting to fetch video info (attempt ${retryCount + 1})...`);
      updateProcessingStage('Connecting to YouTube API', 20);
      
      const response = await apiClient.getVideoInfo(cleanedUrl);
      
      updateProcessingStage('Video information received', 100);
      setVideoInfo(response.data);
      setStep(2);
      stopProcessingTimer(true);
    } catch (error) {
      console.error('Error fetching video info:', error);
      
      // Determine if we should retry
      const MAX_RETRIES = 2; // Maximum 3 attempts (initial + 2 retries)
      const shouldRetry = retryCount < MAX_RETRIES && 
                         (error.code === 'ECONNRESET' || 
                          error.code === 'ETIMEDOUT' ||
                          (error.response && error.response.status >= 500) ||
                          error.message === 'Network Error');
      
      if (shouldRetry) {
        console.log(`Retrying video info fetch (${retryCount + 1}/${MAX_RETRIES})...`);
        setError(`Attempt ${retryCount + 1} failed. Retrying...`);
        
        updateProcessingStage(`Retrying (attempt ${retryCount + 2})`, 30);
        
        // Wait a bit before retrying (increasing delay with each retry)
        const delay = (retryCount + 1) * 1000; // 1s, 2s, 3s
        setTimeout(() => fetchVideoInfo(retryCount + 1), delay);
        return;
      }
      
      // If we're not retrying, or if we've exhausted retries, show the error
      let errorMessage = 'Failed to fetch video information. Please check the URL and try again.';
      
      // Handle specific error messages from the server
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'The request timed out. The YouTube server might be busy, please try again later.';
      }
      
      setError(errorMessage);
      setLoading(false);
      stopProcessingTimer();
    }
  };

  // Setup socket connection and event listeners
  useEffect(() => {
    // Initialize socket connection
    const socket = socketService.connect();
    
    // Subscribe to extraction progress updates
    const unsubscribe = socketService.subscribeToExtractionProgress((data) => {
      log('Received extraction progress update:', data);
      
      // Update processing state based on the event
      const { stage, progress, message, title } = data;
      
      // Update processing stage and progress
      updateProcessingStage(stage, progress);
      
      // Handle completion
      if (stage === 'completed') {
        log('Extraction process completed!');
        
        // Stop the timer
        stopProcessingTimer(true);
        
        // Special handling for transcription completed
        if (message && message.includes('Transcription completed')) {
          setStep(3); // Move to analysis step
          setLoading(false);
        }
      }
      
      // Handle errors
      if (stage === 'error') {
        log('Extraction process error:', message);
        setError(message || 'Unknown error occurred during extraction');
        stopProcessingTimer();
        setLoading(false);
      }
    });
    
    setSocketSubscribed(true);
    
    // Clean up socket subscriptions
    return () => {
      unsubscribe();
      setSocketSubscribed(false);
    };
  }, []);

  // Update the extraction and transcription method
  const extractAudioAndTranscribe = async () => {
    setLoading(true);
    setError('');
    
    // First ensure socket connection is working
    log('Testing socket connection before starting extraction process');
    socketService.testConnection();
    
    // If socket is not connected, show a helpful error
    if (!socketService.isConnected()) {
      log('Socket not connected, showing error message');
      setError('Could not establish a real-time connection to the server. Progress updates may not be visible. Please refresh the page and try again.');
      // Continue anyway, but the user has been warned
    }
    
    // Estimate processing time based on video length
    const videoLengthSecs = videoInfo?.length_seconds || 600; // Default to 10 min if unknown
    const estimatedProcessingTime = Math.ceil(videoLengthSecs * 2); // Allow for extraction and transcription
    
    // Start timer with estimated time
    startProcessingTimer(estimatedProcessingTime, 'Preparing extraction process');
    updateProcessingStage('Initializing', 0);
    
    try {
      // Short delay to allow UI to update before making the request
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Update progress indicator
      updateProcessingStage('Connecting to server', 5);
      
      log('Starting combined extraction and transcription for URL:', videoUrl);
      
      // Use the combined endpoint for better efficiency
      const response = await apiClient.extractAndTranscribe(videoUrl);
      
      if (response.data.success) {
        log('Combined extraction and transcription completed successfully');
        
        // Update transcript with the result
        setTranscript(response.data.transcription);
        
        // Update video information if returned
        if (response.data.videoInfo) {
          log('Received updated video info from extraction process');
          // Update any missing info in videoInfo state
          setVideoInfo(prevInfo => ({
            ...prevInfo,
            title: response.data.videoInfo.title || prevInfo.title,
            length_seconds: response.data.videoInfo.duration || prevInfo.length_seconds,
            video_id: response.data.videoInfo.videoId || prevInfo.video_id
          }));
        }
        
        // Move to the analysis step
        setStep(3);
        stopProcessingTimer(true);
      } else {
        log('Combined extraction and transcription returned without success flag');
        throw new Error('Failed to extract and transcribe video');
      }
    } catch (error) {
      console.error('Error in extraction and transcription process:', error);
      
      let errorMessage = 'Failed to process video. Please try again or choose a different video.';
      
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Error: ${error.response.data.error}`;
      }
      
      setError(errorMessage);
      stopProcessingTimer();
    } finally {
      setLoading(false);
    }
  };

  // Get recipe analysis from Gordon Ramsay (OpenAI)
  const getRecipeAnalysis = async () => {
    setLoading(true);
    setError('');
    
    // Start timer with estimated time of 45 seconds for AI analysis
    startProcessingTimer(45, 'Preparing analysis request');
    
    try {
      // Format macro goals if user profile exists
      let macroGoals = 'No specific macro goals available.';
      
      if (userProfile) {
        macroGoals = `
          Age: ${userProfile.age}
          Gender: ${userProfile.gender}
          Current Weight: ${userProfile.currentWeight}kg
          Target Weight: ${userProfile.targetWeight}kg
          Activity Level: ${userProfile.activityLevel}
        `;
      }
      
      updateProcessingStage('Sending to Gordon Ramsay for review', 20);
      
      const response = await apiClient.getRecipeAnalysis({
        transcript,
        macroGoals
      });
      
      updateProcessingStage('Analysis complete', 100);
      setRecipeAnalysis(response.data.analysis);
      setStep(4);
      stopProcessingTimer(true);
    } catch (error) {
      console.error('Error getting recipe analysis:', error);
      
      let errorMessage = 'Failed to analyze the recipe. Please try again.';
      
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Error: ${error.response.data.error}`;
        
        // Special handling for OpenAI API errors
        if (error.response.data.details && error.response.data.details.includes('OpenAI API error')) {
          errorMessage += ' The AI service is currently experiencing issues. Please try again later.';
        }
      } else if (error.code === 'ECONNRESET') {
        errorMessage = 'The connection to the server was reset. This might be due to a timeout. Please try again with a shorter video.';
      }
      
      setError(errorMessage);
      stopProcessingTimer();
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!videoUrl) {
      setError('Please enter a YouTube video URL');
      return;
    }
    
    fetchVideoInfo();
  };

  // Handle transcription request
  const handleTranscribeRequest = () => {
    extractAudioAndTranscribe();
  };

  // Handle analysis request
  const handleAnalysisRequest = () => {
    getRecipeAnalysis();
  };

  // Update the updateProcessingTimer function for better time estimation
  const updateProcessingTimer = useCallback(() => {
    if (!processStartTime) return;
    
    const now = Date.now();
    const elapsed = now - processStartTime;
    setElapsedTime(elapsed);
    
    // Update remaining time based on the current stage
    let baseTime = 30000; // Default base time for estimation
    let multiplier = 1;
    
    switch(processingStage) {
      case 'fetching':
        multiplier = 0.5;
        break;
      case 'extracting':
        multiplier = 0.8;
        break;
      case 'analyzing':
        multiplier = 1.5;
        break;
      case 'formatting':
        multiplier = 0.3;
        break;
      default:
        multiplier = 1;
    }
    
    const estimatedTotal = baseTime * multiplier;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    setEstimatedTimeRemaining(remaining);
    
    // Calculate progress more intelligently based on stages
    let progress = 0;
    
    if (processingStage === 'fetching') {
      progress = Math.min(90, (elapsed / (baseTime * 0.5)) * 25);
    } else if (processingStage === 'extracting') {
      progress = 25 + Math.min(65, (elapsed / (baseTime * 0.8)) * 30);
    } else if (processingStage === 'analyzing') {
      progress = 55 + Math.min(35, (elapsed / (baseTime * 1.5)) * 35);
    } else if (processingStage === 'formatting') {
      progress = 90 + Math.min(10, (elapsed / (baseTime * 0.3)) * 10);
    }
    
    setProgressPercent(Math.min(99, progress)); // Cap at 99% until complete
  }, [processStartTime, processingStage]);

  // Render different content based on current step
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="recipe-form-container">
            <h2>Enter a YouTube Recipe URL</h2>
            <p>Paste a URL to a recipe video you'd like to analyze. For best results, choose videos that clearly explain the recipe ingredients and steps.</p>
            
            <form onSubmit={handleSubmit} className="recipe-form">
              <div className="form-group">
                <label htmlFor="videoUrl" className="form-label">YouTube Video URL</label>
                <div className="url-input-container">
                  <input
                    type="text"
                    id="videoUrl"
                    name="videoUrl"
                    className="url-input"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={handleVideoUrlChange}
                    disabled={loading}
                  />
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={loading || !videoUrl}
                  >
                    {loading ? 'Processing...' : 'Analyze'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        );
        
      case 2:
        return (
          <div className="video-info-container">
            <h2>Video Information</h2>
            
            {videoInfo && (
              <>
                <div className="video-details">
                  <div className="video-thumbnail">
                    <img 
                      src={videoInfo.thumbnail_url || `https://img.youtube.com/vi/${videoInfo.video_id}/0.jpg`}
                      alt={videoInfo.title || 'Video thumbnail'}
                    />
                  </div>
                  
                  <div className="video-meta">
                    <h3 className="video-title">{videoInfo.title}</h3>
                    
                    <div className="video-stats">
                      {videoInfo.length_seconds && (
                        <div className="video-duration">
                          <span className="stat-label">Duration:</span> 
                          <span className="stat-value">{formatDuration(videoInfo.length_seconds)}</span>
                        </div>
                      )}
                      
                      {videoInfo.view_count && (
                        <div className="video-views">
                          <span className="stat-label">Views:</span> 
                          <span className="stat-value">{formatViews(videoInfo.view_count)}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="extraction-info">
                      I will extract audio from this video, transcribe it using AI, and analyze it for recipe details.
                      This process takes approximately {formatDuration(videoInfo.length_seconds * 2)}.
                    </p>
                  </div>
                </div>
                
                <div className="action-buttons">
                  <button 
                    className="action-btn back-btn"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    Change Video
                  </button>
                  
                  <button 
                    className="action-btn primary-btn"
                    onClick={handleTranscribeRequest}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Extract & Transcribe'}
                  </button>
                </div>
              </>
            )}
          </div>
        );
        
      case 3:
        // Transcription results and analysis request
        return (
          <div className="transcription-container">
            <h2>Recipe Transcription</h2>
            
            <div className="transcription-info">
              <p>
                I've extracted and transcribed the audio from the video. You can review the transcription below.
                {userProfile ? 
                  ` Based on your profile, I'll customize the recipe analysis to match your fitness goals.` : 
                  ` I'll analyze this to extract the recipe details.`}
              </p>
              
              {userProfile && (
                <div className="profile-reminder">
                  <h4>Your Health Profile</h4>
                  <ul>
                    <li>Age: {userProfile.age}</li>
                    <li>Current Weight: {userProfile.currentWeight}kg</li>
                    <li>Target Weight: {userProfile.targetWeight}kg</li>
                    <li>Activity Level: {userProfile.activityLevel}</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="transcription-text-container">
              <h3>Transcription</h3>
              <div className="transcription-text">
                {transcript || 'No transcription available. Please try extracting the audio again.'}
              </div>
            </div>
            
            <div className="action-buttons">
              <button 
                className="action-btn back-btn"
                onClick={() => setStep(2)}
                disabled={loading}
              >
                Back to Video
              </button>
              
              <button 
                className="action-btn primary-btn"
                onClick={handleAnalysisRequest}
                disabled={loading || !transcript}
              >
                {loading ? 'Analyzing...' : 'Analyze Recipe'}
              </button>
            </div>
          </div>
        );
        
      case 4:
        // Recipe analysis results
        return (
          <div className="analysis-container">
            <h2>Gordon Ramsay's Recipe Analysis</h2>
            
            <div className="analysis-content">
              {recipeAnalysis ? (
                <div className="recipe-analysis" dangerouslySetInnerHTML={{ __html: recipeAnalysis }} />
              ) : (
                <p>No analysis available. Please try analyzing the recipe again.</p>
              )}
            </div>
            
            <div className="action-buttons">
              <button 
                className="action-btn back-btn"
                onClick={() => setStep(3)}
                disabled={loading}
              >
                Back to Transcription
              </button>
              
              <button 
                className="action-btn restart-btn"
                onClick={() => {
                  setStep(1);
                  setVideoUrl('');
                  setVideoInfo(null);
                  setTranscript('');
                  setRecipeAnalysis('');
                  setError('');
                }}
                disabled={loading}
              >
                Start Over
              </button>
            </div>
          </div>
        );
        
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="recipe-extractor-page">
      <div className="container">
        <div className="recipe-header">
          <h1>Recipe Extractor & Analysis</h1>
          <p>Turn any YouTube cooking video into a meal prep plan with Gordon Ramsay's brutal honesty</p>
        </div>
        
        <div className="recipe-content">
          {error && <ErrorDisplay message={error} />}
          
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Enter URL</div>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Video Info</div>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Transcript</div>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>
              <div className="step-number">4</div>
              <div className="step-label">Analysis</div>
            </div>
          </div>
          
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default RecipeExtractorPage;