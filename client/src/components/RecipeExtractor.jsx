import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import '../styles/RecipeExtractor.css';

const RecipeExtractor = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ stage: '', progress: 0, message: '' });
  const [userId, setUserId] = useState('');
  
  const socket = useSocket();

  useEffect(() => {
    // Try to get userId from localStorage or generate a temporary one
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      // Generate a temporary ID
      const tempId = `temp_user_${Date.now()}`;
      localStorage.setItem('userId', tempId);
      setUserId(tempId);
    }
    
    if (socket) {
      // Listen for progress updates from the server
      socket.on('extractionProgress', (data) => {
        console.log('Extraction progress:', data);
        setProgress(data);
      });
      
      return () => {
        socket.off('extractionProgress');
      };
    }
  }, [socket]);

  const handleUrlChange = (e) => {
    setVideoUrl(e.target.value);
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

  const extractAndTranscribe = async () => {
    if (!validateYouTubeUrl(videoUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    
    setError('');
    setLoading(true);
    setProgress({ stage: 'initialized', progress: 0, message: 'Starting...' });
    
    try {
      // Call the extract-and-transcribe endpoint
      const response = await apiClient.extractAndTranscribe(videoUrl);
      
      if (response.data && response.data.transcription) {
        setTranscript(response.data.transcription);
        
        // Now analyze the transcript to extract the recipe
        await analyzeRecipe(response.data.transcription);
      } else {
        // If we got a response but no transcription, try to get recipe from video title
        setProgress({ stage: 'fallback', progress: 70, message: 'Audio extraction failed. Generating recipe from video title...' });
        await getFallbackRecipe();
      }
    } catch (err) {
      console.error('Error extracting audio:', err);
      
      // Clear previous errors to show we're trying fallback
      setError('');
      setProgress({ stage: 'fallback', progress: 50, message: 'Audio extraction failed. Trying to generate recipe from video title...' });
      
      try {
        // Directly attempt the fallback without using the previous error data
        await getFallbackRecipe();
      } catch (fallbackErr) {
        console.error('Fallback recipe generation also failed:', fallbackErr);
        setError('Failed to extract or generate a recipe. Please try a different video.');
        setProgress({ stage: 'error', progress: 0, message: 'All recipe generation attempts failed' });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const getFallbackRecipe = async () => {
    try {
      console.log('======= FALLBACK RECIPE GENERATION =======');
      console.log('Attempting fallback recipe generation with video URL:', videoUrl);
      console.log('Using userId:', userId);
      
      // Call the recipe analysis endpoint with just the video URL, no transcript
      const response = await apiClient.getRecipeAnalysis({ 
        videoUrl: videoUrl,
        userId: userId
      });
      
      console.log('Fallback recipe response received:', response.data ? 'Yes' : 'No');
      console.log('Contains recipe data:', response.data && response.data.recipe ? 'Yes' : 'No');
      console.log('Source:', response.data && response.data.source ? response.data.source : 'Unknown');
      
      if (response.data && response.data.recipe) {
        console.log('Recipe title:', response.data.recipe.title);
        setRecipe(response.data.recipe);
        setProgress({ 
          stage: 'completed', 
          progress: 100, 
          message: 'Recipe generated from video title! (Fallback method)',
          source: response.data.source || 'video_title'
        });
        // Clear any previous error messages
        setError('');
      } else {
        console.log('No recipe data in response:', response.data);
        throw new Error('No recipe data returned from fallback generation');
      }
    } catch (err) {
      console.error('Error generating fallback recipe:', err);
      setError(`Fallback recipe generation failed: ${err.message || 'Unknown error'}`);
      throw err; // Rethrow so the calling function can handle it
    }
  };
  
  const analyzeRecipe = async (transcriptText) => {
    setProgress({ stage: 'analyzing', progress: 90, message: 'Analyzing transcript for recipe...' });
    
    try {
      const response = await apiClient.getRecipeAnalysis({ 
        transcript: transcriptText,
        videoUrl: videoUrl,
        userId: userId
      });
      
      if (response.data && response.data.recipe) {
        setRecipe(response.data.recipe);
        setProgress({ 
          stage: 'completed', 
          progress: 100, 
          message: response.data.source === 'video_title' 
            ? 'Recipe generated from video title!' 
            : 'Recipe extracted from transcript!',
          source: response.data.source
        });
      }
    } catch (err) {
      console.error('Error analyzing recipe:', err);
      setError(err.response?.data?.error || 'Failed to analyze the recipe');
      setProgress({ stage: 'error', progress: 0, message: 'Error analyzing recipe' });
    }
  };

  return (
    <div className="recipe-extractor">
      <div className="recipe-form">
        <p>
          Extract cooking recipes from YouTube videos. Simply paste a YouTube URL to get started.
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
            onClick={videoInfo ? extractAndTranscribe : getVideoInfo}
            disabled={loading || !videoUrl}
            className="submit-btn"
          >
            {videoInfo ? 'Extract Recipe' : 'Get Info'}
          </button>
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
            <p>Duration: {Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')}</p>
            {videoInfo.thumbnailUrl && (
              <div className="thumbnail">
                <img 
                  src={videoInfo.thumbnailUrl} 
                  alt={videoInfo.title}
                  style={{ maxWidth: '100%', maxHeight: 200 }} 
                />
              </div>
            )}
          </div>
        )}
        
        {recipe && (
          <div className="recipe-result">
            <h3>Extracted Recipe</h3>
            
            <div className="recipe-section">
              <h4>Ingredients</h4>
              <ul>
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </div>
            
            <div className="recipe-section">
              <h4>Instructions</h4>
              <ol>
                {recipe.instructions.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
            
            {recipe.notes && (
              <div className="recipe-section">
                <h4>Notes</h4>
                <p>{recipe.notes}</p>
              </div>
            )}
            
            {recipe.nutritionInfo && (
              <div className="recipe-section">
                <h4>Nutrition Information</h4>
                <p>{recipe.nutritionInfo}</p>
              </div>
            )}
          </div>
        )}
        
        {transcript && !recipe && (
          <div className="transcript">
            <h3>Transcript</h3>
            <div className="transcript-text">{transcript}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeExtractor; 