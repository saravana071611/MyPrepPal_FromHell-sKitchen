import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import '../styles/RecipeExtractor.css';

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
    setProgress({ stage: 'initialized', progress: 0, message: 'Starting extraction and meal prep...' });
    
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
  };

  const processForMealPrep = async (transcriptText) => {
    setProgress({ stage: 'analyzing', progress: 70, message: 'Generating meal prep with Gordon Ramsay...' });
    
    try {
      // Call the meal prep processing endpoint
      const response = await apiClient.getRecipeAnalysis({ 
        transcript: transcriptText,
        videoUrl: videoUrl,
        userId: userId,
        fullMealPrep: true  // Indicate that we want the full meal prep analysis
      });
      
      if (response.data && response.data.mealPrep) {
        setMealPrepData(response.data.mealPrep);
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
    <div className="recipe-extractor meal-prep-container">
      <div className="recipe-form">
        <p>
          Extract complete meal prep instructions from cooking videos, enhanced by Gordon Ramsay.
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
            <div>Loading... {progress.message || ''}</div>
            {progress.progress > 0 && (
              <div className="progress-bar-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            )}
          </div>
        )}
        
        {videoInfo && (
          <div className="video-info">
            <h3>{videoInfo.title}</h3>
            <p>Created by: {videoInfo.author || 'Unknown Creator'}</p>
            <p>Duration: {formatDuration(videoInfo.length_seconds)}</p>
            <p>Views: {formatViews(videoInfo.views)}</p>
            <p>Published: {videoInfo.publish_date || 'Unknown date'}</p>
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
        
        {mealPrepData && (
          <div className="meal-prep-result">
            <h2>Complete Meal Prep Guide</h2>
            
            {/* Recipe Feedback Section */}
            {mealPrepData.feedback && (
              <div className="meal-prep-section">
                <h3>Recipe Feedback</h3>
                <div className="section-content">
                  {mealPrepData.feedback}
                </div>
              </div>
            )}
            
            {/* Grocery List Section */}
            {mealPrepData.groceryList && (
              <div className="meal-prep-section">
                <h3>Grocery List</h3>
                <div className="section-content">
                  {mealPrepData.groceryList}
                </div>
              </div>
            )}
            
            {/* Cooking Instructions Section */}
            {mealPrepData.instructions && (
              <div className="meal-prep-section">
                <h3>Cooking Instructions</h3>
                <div className="section-content">
                  {mealPrepData.instructions}
                </div>
              </div>
            )}
            
            {/* Macro Information Section */}
            {mealPrepData.macros && (
              <div className="meal-prep-section">
                <h3>Nutrition Information</h3>
                <div className="section-content">
                  {mealPrepData.macros}
                </div>
              </div>
            )}
            
            {/* Storage Instructions Section */}
            {mealPrepData.storage && (
              <div className="meal-prep-section">
                <h3>Storage & Reheating</h3>
                <div className="section-content">
                  {mealPrepData.storage}
                </div>
              </div>
            )}
            
            {/* If we also have raw Gordon Ramsay feedback */}
            {mealPrepData.raw && (
              <div className="meal-prep-section original-feedback">
                <h3>Gordon's Original Feedback</h3>
                <div className="section-content">
                  <pre>{mealPrepData.raw}</pre>
                </div>
              </div>
            )}
          </div>
        )}
        
        {transcript && !mealPrepData && (
          <div className="transcript">
            <h3>Transcript</h3>
            <div className="transcript-text">{transcript}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtractAndPrep; 