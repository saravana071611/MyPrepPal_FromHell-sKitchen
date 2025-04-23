import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import MealPrepGenerator from './MealPrepGenerator';
import '../styles/RecipeExtractor.css';
import '../styles/MealPrepGenerator.css';

// Helper function to format duration in seconds to HH:MM:SS format
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return 'Unknown';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

// Helper function to format view count with commas
const formatViews = (views) => {
  if (!views || isNaN(views)) return 'Unknown';
  
  // Format with commas for thousands
  return new Intl.NumberFormat().format(views);
};

const ExtractAndPrep = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [mealPrepData, setMealPrepData] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ stage: '', progress: 0, message: '' });
  const [userId, setUserId] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  
  const socket = useSocket();
  
  // Generate a user ID if we don't have one
  useEffect(() => {
    if (!userId) {
      const generatedId = `user_${Date.now()}`;
      setUserId(generatedId);
      console.log('Generated user ID:', generatedId);
    }
  }, [userId]);
  
  // Set up socket listeners for real-time progress updates
  useEffect(() => {
    if (socket) {
      // Listen for extraction progress updates
      socket.on('extractionProgress', (data) => {
        console.log('Extraction progress update:', data);
        setProgress(data);
        
        if (data.stage === 'completed') {
          setLoading(false);
          if (data.title) {
            console.log('Extraction completed with title:', data.title);
          }
        } else if (data.stage === 'error') {
          setLoading(false);
          setError(data.message || 'An error occurred during extraction');
        }
      });
      
      // Clean up listeners when component unmounts
      return () => {
        socket.off('extractionProgress');
      };
    }
  }, [socket]);
  
  // Poll for status updates when we have a processing ID
  useEffect(() => {
    let statusInterval;
    
    if (processingId && processingStatus === 'processing') {
      console.log('Starting polling for processing status');
      statusInterval = setInterval(checkProcessingStatus, 10000); // Check every 10 seconds
    }
    
    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [processingId, processingStatus]);
  
  // Function to check the processing status
  const checkProcessingStatus = async () => {
    if (!processingId) return;
    
    try {
      const response = await apiClient.getMealPrepStatus(processingId);
      console.log('Processing status update:', response.data);
      
      setProcessingStatus(response.data.status);
      
      // Update progress based on status
      if (response.data.status === 'completed') {
        setProgress({ 
          stage: 'completed', 
          progress: 100, 
          message: 'Meal prep instructions generated successfully!' 
        });
        // Fetch the meal prep data
        fetchMealPrepData();
        // Stop polling
        setProcessingStatus('done');
      } else if (response.data.status === 'failed' || response.data.status === 'error') {
        setProgress({ 
          stage: 'error', 
          progress: 0, 
          message: response.data.message || 'Error processing recipe'
        });
        setError(response.data.message || 'Failed to process the recipe');
        // Stop polling
        setProcessingStatus('done');
      } else {
        // Update progress for processing
        setProgress({ 
          stage: response.data.status, 
          progress: calculateProgress(response.data.status), 
          message: response.data.message || 'Processing recipe...'
        });
      }
    } catch (err) {
      console.error('Error checking processing status:', err);
      setError('Error checking processing status');
      setProcessingStatus('done');
    }
  };
  
  // Calculate progress percentage based on status
  const calculateProgress = (status) => {
    switch (status) {
      case 'initialized': return 10;
      case 'extracting_audio': return 30;
      case 'transcribing': return 50;
      case 'generating_meal_prep': return 70;
      case 'generating_detailed_feedback': return 90;
      case 'completed': return 100;
      default: return 50;
    }
  };
  
  // Fetch meal prep data when processing is complete
  const fetchMealPrepData = async () => {
    try {
      const response = await apiClient.getMealPrepData(processingId);
      console.log('Meal prep data received:', response.data);
      
      if (response.data.success && response.data.mealPrepInfo) {
        setMealPrepData(response.data.mealPrepInfo);
      } else {
        setError('Failed to get meal prep data');
      }
    } catch (err) {
      console.error('Error getting meal prep data:', err);
      setError('Error retrieving meal prep data');
    }
  };
  
  const handleUrlChange = (e) => {
    setVideoUrl(e.target.value);
    // Clear previous data when URL changes
    if (videoInfo) {
      setVideoInfo(null);
    }
    if (mealPrepData) {
      setMealPrepData(null);
    }
    if (transcript) {
      setTranscript('');
    }
    if (error) {
      setError('');
    }
    if (processingId) {
      setProcessingId(null);
    }
    if (processingStatus) {
      setProcessingStatus(null);
    }
  };
  
  const validateYouTubeUrl = (url) => {
    if (!url) return false;
    
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
    return pattern.test(url);
  };

  const getVideoInfo = async () => {
    if (!validateYouTubeUrl(videoUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const response = await apiClient.getVideoInfo(videoUrl);
      setVideoInfo(response.data);
    } catch (err) {
      console.error('Error fetching video info:', err);
      setError(err.response?.data?.error || 'Failed to fetch video information');
    } finally {
      setLoading(false);
    }
  };

  const extractAndPrepare = async () => {
    if (!validateYouTubeUrl(videoUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    
    setError('');
    setLoading(true);
    setProgress({ stage: 'initialized', progress: 10, message: 'Starting extraction and meal prep...' });
    
    // First approach: Use the direct socket-based transcription
    if (socket) {
      try {
        // Start the process-recipe API call
        const response = await apiClient.processMealPrep(videoUrl);
        console.log('Process recipe response:', response.data);
        
        if (response.data.success && response.data.processingId) {
          setProcessingId(response.data.processingId);
          setProcessingStatus('processing');
          
          // The rest will be handled by the status polling
        } else {
          setError('Failed to start recipe processing');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error starting meal prep process:', err);
        setError(err.response?.data?.error || 'Failed to start meal prep process');
        setLoading(false);
      }
    } else {
      // Fallback: use the old approach with transcription and separate meal prep
      try {
        // First step: Call the extract-and-transcribe endpoint
        console.log('Starting extraction and transcription for URL:', videoUrl);
        const response = await apiClient.extractAndTranscribe(videoUrl);
        console.log('Extraction response received:', response.data);
        
        if (response.data && response.data.transcription) {
          setTranscript(response.data.transcription);
          
          // Second step: Process the transcript for meal prep info
          await processForMealPrep(response.data.transcription);
        } else {
          // If we got a response but no transcription, handle the error
          console.warn('No transcription in response data:', response.data);
          setProgress({ stage: 'error', progress: 0, message: 'Failed to extract audio and transcribe video.' });
          setError('Failed to extract audio and transcribe video. Please try another video.');
        }
      } catch (err) {
        console.error('Error in extraction and meal prep process:', err);
        setProgress({ stage: 'error', progress: 0, message: 'Error processing video' });
        setError(err.response?.data?.error || 'Failed to process the video');
      } finally {
        setLoading(false);
      }
    }
  };

  const processForMealPrep = async (transcriptText) => {
    setProgress({ stage: 'analyzing', progress: 70, message: 'Generating meal prep with Gordon Ramsay...' });
    
    try {
      // Use the new direct transcription endpoint
      const response = await apiClient.generateFromTranscription(transcriptText);
      
      if (response.data && response.data.mealPrepInfo) {
        setMealPrepData(response.data.mealPrepInfo);
        setProgress({ 
          stage: 'completed', 
          progress: 100, 
          message: 'Meal prep instructions generated successfully!'
        });
      } else {
        throw new Error('No meal prep data returned from the server');
      }
    } catch (err) {
      console.error('Error generating meal prep:', err);
      setError(err.response?.data?.error || 'Failed to generate meal prep instructions');
      setProgress({ stage: 'error', progress: 0, message: 'Error generating meal prep' });
    }
  };

  return (
    <div className="recipe-extractor">
      <div className="recipe-form">
        <p className="extract-intro">
          Extract complete meal prep instructions from cooking videos, enhanced by Gordon Ramsay's expertise.
          Get detailed grocery lists, cooking instructions, and macro information for 5 portions.
        </p>
        
        <div className="form-group">
          <input
            type="text"
            value={videoUrl}
            onChange={handleUrlChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className="url-input"
          />
          <button 
            onClick={videoInfo ? extractAndPrepare : getVideoInfo}
            disabled={loading || !videoUrl}
            className="submit-btn"
          >
            {videoInfo ? 'Extract Recipe & Prep' : 'Get Info'}
          </button>
        </div>
        
        <div className="example-link">
          Example: <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              setVideoUrl("https://www.youtube.com/watch?v=W1XELWKaCi4");
            }}
          >
            https://www.youtube.com/watch?v=W1XELWKaCi4
          </a> (Chicken Pot Pie)
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {loading && (
          <div className="loading-indicator">
            <div className="loading-message">{progress.message || 'Loading...'}</div>
            {progress.progress > 0 && (
              <div className="progress-bar-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${progress.progress}%` }}
                ></div>
                <div className="progress-percentage">{Math.round(progress.progress)}%</div>
              </div>
            )}
          </div>
        )}
        
        {videoInfo && (
          <div className="video-info">
            <h3>{videoInfo.title}</h3>
            <p>Created by: {videoInfo.author || 'Unknown Creator'}</p>
            <div className="video-details">
              <div className="detail-item">
                <span className="detail-label">Duration:</span> 
                <span className="detail-value">{formatDuration(videoInfo.length_seconds)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Views:</span> 
                <span className="detail-value">{formatViews(videoInfo.views)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Published:</span> 
                <span className="detail-value">{videoInfo.publish_date || 'Unknown date'}</span>
              </div>
            </div>
            {videoInfo.thumbnail_url && (
              <div className="thumbnail">
                <img 
                  src={videoInfo.thumbnail_url} 
                  alt={videoInfo.title}
                  style={{ maxWidth: '100%', maxHeight: 200 }} 
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Display transcript if available */}
      {transcript && !mealPrepData && (
        <div className="transcript-container">
          <h3>Recipe Transcript</h3>
          <div className="transcript-scroll">
            <pre className="transcript">{transcript}</pre>
          </div>
        </div>
      )}
      
      {/* Display meal prep information if available */}
      {mealPrepData && <MealPrepGenerator mealPrepData={mealPrepData} />}
    </div>
  );
};

export default ExtractAndPrep; 