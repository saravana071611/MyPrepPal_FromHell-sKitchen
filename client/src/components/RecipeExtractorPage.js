import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/RecipeExtractorPage.css';

const RecipeExtractorPage = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [recipeAnalysis, setRecipeAnalysis] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  // Load user profile on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // Get the latest user profile (in a real app, we'd have proper user auth)
        // For now, we'll just look for any profile in localStorage
        const userId = localStorage.getItem('userId');
        
        if (userId) {
          const response = await axios.get(`/api/user/profile/${userId}`);
          setUserProfile(response.data);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Not a critical error, so we don't set the error state
      }
    };
    
    loadUserProfile();
  }, []);

  // Handle video URL input
  const handleVideoUrlChange = (e) => {
    setVideoUrl(e.target.value);
  };

  // Fetch video info
  const fetchVideoInfo = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`/api/youtube/video-info?videoUrl=${encodeURIComponent(videoUrl)}`);
      setVideoInfo(response.data);
      setStep(2);
    } catch (error) {
      console.error('Error fetching video info:', error);
      setError('Failed to fetch video info. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Extract audio and get transcript
  const extractAudioAndTranscribe = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Step 1: Extract audio from YouTube video
      const extractResponse = await axios.post('/api/youtube/extract-audio', { videoUrl });
      
      // Step 2: Transcribe the audio with OpenAI Whisper
      const transcribeResponse = await axios.post('/api/openai/transcribe', { 
        audioFilePath: extractResponse.data.audioFilePath 
      });
      
      setTranscript(transcribeResponse.data.transcript);
      setStep(3);
    } catch (error) {
      console.error('Error extracting and transcribing audio:', error);
      setError('Failed to extract and transcribe the video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get recipe analysis from Gordon Ramsay (OpenAI)
  const getRecipeAnalysis = async () => {
    setLoading(true);
    setError('');
    
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
      
      const response = await axios.post('/api/openai/recipe-analysis', {
        transcript,
        macroGoals
      });
      
      setRecipeAnalysis(response.data.analysis);
      setStep(4);
    } catch (error) {
      console.error('Error getting recipe analysis:', error);
      setError('Failed to analyze the recipe. Please try again.');
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
                <input
                  type="url"
                  id="videoUrl"
                  className="form-control"
                  value={videoUrl}
                  onChange={handleVideoUrlChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Get Video Info'}
              </button>
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
                    <p className="video-length">Duration: {Math.floor(videoInfo.length_seconds / 60)} min {videoInfo.length_seconds % 60} sec</p>
                    <p className="video-views">Views: {videoInfo.views.toLocaleString()}</p>
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
          {error && <div className="error-message">{error}</div>}
          
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