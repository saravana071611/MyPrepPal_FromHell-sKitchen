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
    'formatting': 'Formatting the recipe for display...'
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
    setProcessingStage(stage);
    if (percentComplete) setProgressPercent(percentComplete);
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

  // Set up socket connection and listeners
  useEffect(() => {
    // Connect to socket.io
    socketService.connect();
    
    // Set up listener for audio extraction progress
    const unsubscribeAudio = socketService.subscribeToAudioProgress((data) => {
      console.log('Audio extraction progress:', data);
      
      if (data.stage === 'error') {
        setError(data.message || 'Error during audio extraction');
        stopProcessingTimer();
        setLoading(false);
        return;
      }
      
      // Map socket progress stages to our UI stages
      const stageMap = {
        'initialized': { stage: 'Preparing to extract audio', percent: 0 },
        'info': { stage: 'Fetching video information', percent: 10 },
        'download': { stage: 'Downloading audio from YouTube', percent: data.progress || 20 },
        'processing': { stage: 'Processing audio file', percent: data.progress || 80 },
        'completed': { stage: 'Audio extraction complete', percent: 100 }
      };
      
      const mappedStage = stageMap[data.stage] || { stage: data.message || 'Processing', percent: data.progress || 50 };
      
      // Update processing stage and progress
      updateProcessingStage(mappedStage.stage, mappedStage.percent);
      
      // Audio extraction progress will be shown, but we won't automatically proceed to transcription
      // The extractAudioAndTranscribe function will handle the API call for transcription
    });
    
    // Add listener for transcription progress updates
    const unsubscribeTranscription = socketService.subscribeToTranscriptionProgress((data) => {
      console.log('Transcription progress:', data);
      
      if (data.stage === 'error') {
        setError(data.message || 'Error during transcription');
        stopProcessingTimer();
        setLoading(false);
        return;
      }
      
      // Map socket progress stages to our UI stages
      const stageMap = {
        'initialized': { stage: 'Starting transcription', percent: 60 },
        'processing': { stage: 'Transcribing audio', percent: data.progress || 70 },
        'finalizing': { stage: 'Finalizing transcription', percent: 90 },
        'completed': { stage: 'Transcription complete', percent: 100 }
      };
      
      const mappedStage = stageMap[data.stage] || { stage: data.message || 'Processing transcription', percent: data.progress || 75 };
      
      // Update processing stage and progress
      updateProcessingStage(mappedStage.stage, mappedStage.percent);
      
      // If transcription is complete, update the UI
      if (data.stage === 'completed' && data.transcript) {
        setTranscript(data.transcript);
        setStep(3);
        stopProcessingTimer(true);
        setLoading(false);
      }
    });
    
    // Clean up socket listeners on component unmount
    return () => {
      unsubscribeAudio();
      unsubscribeTranscription();
    };
  }, []);

  // Extract audio and transcribe - modified to use socket updates
  const extractAudioAndTranscribe = async () => {
    setLoading(true);
    setError('');
    
    // Estimate processing time based on video length
    // Rule of thumb: ~1.5x the video length is a reasonable estimate
    const videoLengthSecs = videoInfo?.length_seconds || 600; // Default to 10 min if unknown
    const estimatedProcessingTime = Math.ceil(videoLengthSecs * 1.5); 
    
    // Start timer with estimated time
    startProcessingTimer(estimatedProcessingTime, 'Preparing to extract audio');
    
    try {
      // Kick off the audio extraction process - progress will be tracked via socket.io
      await apiClient.extractAudio(videoUrl);
      
      // Start the transcription process
      await apiClient.transcribeAudio({ videoUrl });
      
      // The socket listeners will handle progress updates for both extraction and transcription
    } catch (error) {
      console.error('Error in audio extraction or transcription:', error);
      let errorMessage = 'Failed to process video. Please try again or choose a different video.';
      
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Error: ${error.response.data.error}`;
      }
      
      setError(errorMessage);
      stopProcessingTimer();
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
            <p>Paste a URL to a short (20-30 min) recipe video you'd like to analyze.</p>
            
            <form onSubmit={handleSubmit} className="recipe-form">
              <div className="form-group">
                <label htmlFor="videoUrl" className="form-label">YouTube Video URL</label>
                <div className="url-input-container">
                  <input
                    type="url"
                    id="videoUrl"
                    className="form-control"
                    value={videoUrl}
                    onChange={handleVideoUrlChange}
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                    disabled={loading}
                  />
                  {loading && <div className="input-loading-indicator"></div>}
                </div>
                <div className="form-hint">
                  <p>Example: <a href="#" onClick={(e) => {e.preventDefault(); setVideoUrl('https://www.youtube.com/watch?v=Cyskqnp1j64');}}><i className="fas fa-link"></i> Gordon Ramsay's Recipe</a></p>
                  <p>Try this: <a href="#" onClick={(e) => {e.preventDefault(); setVideoUrl('https://www.youtube.com/watch?v=yRg1lY98bxE');}}><i className="fas fa-link"></i> Alternative Recipe Video</a></p>
                  <p className="hint-details">Supported formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID</p>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
              >
                {loading ? 'Fetching Video Info...' : 'Get Video Info'}
              </button>
              
              {loading && (
                <div className="loading-message">
                  <p>Please wait while we check the video information...</p>
                  <ProcessingStatus 
                    processingStage={processingStage}
                    elapsedTime={elapsedTime}
                    estimatedTimeRemaining={estimatedTimeRemaining}
                    progressPercent={progressPercent}
                  />
                </div>
              )}
            </form>
          </div>
        );
        
      case 2:
        return (
          <div className="video-info-container">
            <h2>Video Found!</h2>
            <div className="video-preview">
              {videoInfo && (
                <>
                  <div className="video-thumbnail">
                    <img 
                      src={videoInfo.thumbnail_url} 
                      alt={videoInfo.title} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/480x360?text=No+Thumbnail';
                      }}
                    />
                  </div>
                  <div className="video-details">
                    <h3>{videoInfo.title}</h3>
                    <p className="video-author">By {videoInfo.author}</p>
                    <p className="video-length">Duration: {formatDuration(videoInfo.length_seconds)}</p>
                    <p className="video-views">{formatViews(videoInfo.views)}</p>
                  </div>
                </>
              )}
            </div>
            
            <p className="step-description">
              Now I'll extract the audio from this video and generate a transcript.
              This might take a few minutes depending on the video length.
            </p>
            
            <button 
              onClick={handleTranscribeRequest} 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Extract & Transcribe'}
            </button>
            
            {loading && (
              <div className="loading-message">
                <p>Please wait while we extract and transcribe the audio...</p>
                <ProcessingStatus 
                  processingStage={processingStage}
                  elapsedTime={elapsedTime}
                  estimatedTimeRemaining={estimatedTimeRemaining}
                  progressPercent={progressPercent}
                />
              </div>
            )}
            
            <button 
              onClick={() => setStep(1)} 
              className="btn btn-secondary"
              disabled={loading}
            >
              Choose Different Video
            </button>
          </div>
        );
        
      case 3:
        return (
          <div className="transcript-container">
            <h2>Transcript Generated!</h2>
            <p className="step-description">
              I've successfully transcribed the video. Now Gordon Ramsay will analyze this recipe
              {userProfile ? ' based on your fitness profile and macro goals.' : '.'}
            </p>
            
            <div className="transcript-box">
              <h3>Video Transcript</h3>
              <div className="transcript-content">
                <p>{transcript}</p>
              </div>
            </div>
            
            <button 
              onClick={handleAnalysisRequest} 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Get Gordon\'s Analysis'}
            </button>
            
            {loading && (
              <div className="loading-message">
                <p>Please wait while Gordon Ramsay analyzes your recipe...</p>
                <ProcessingStatus 
                  processingStage={processingStage}
                  elapsedTime={elapsedTime}
                  estimatedTimeRemaining={estimatedTimeRemaining}
                  progressPercent={progressPercent}
                />
              </div>
            )}
          </div>
        );
        
      case 4:
        return (
          <div className="analysis-container">
            <h2>Gordon Ramsay's Recipe Analysis</h2>
            
            <div className="gordon-avatar-container">
              <img 
                src="/images/gordon-ramsay.jpg" 
                alt="Gordon Ramsay" 
                className="gordon-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            </div>
            
            <div className="analysis-content">
              <p>{recipeAnalysis}</p>
            </div>
            
            <button 
              onClick={() => setStep(1)} 
              className="btn btn-primary"
            >
              Analyze Another Recipe
            </button>
            
            {!userProfile && (
              <div className="profile-suggestion">
                <p>Want a personalized macro nutrition plan? Create your fitness profile!</p>
                <a href="/profile" className="btn btn-secondary">Create Profile</a>
              </div>
            )}
          </div>
        );
        
      default:
        return <div>Something went wrong. Please refresh the page.</div>;
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