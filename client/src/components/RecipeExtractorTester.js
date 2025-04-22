import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { socketService } from '../utils/socket';
import '../styles/RecipeExtractorTester.css';

const RecipeExtractorTester = () => {
  const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=Cyskqnp1j64');
  const [extractionStatus, setExtractionStatus] = useState(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState(null);
  const [audioPath, setAudioPath] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect to socket
    socketService.connect();

    // Subscribe to socket events for extraction progress
    const unsubscribeExtraction = socketService.subscribeToAudioProgress((data) => {
      console.log('Audio extraction progress:', data);
      setExtractionStatus(data);
      addLog(`Extraction: ${data.stage} (${data.progress}%) - ${data.message}`);

      // When extraction is complete, store the audio path
      if (data.stage === 'completed' && data.audioPath) {
        setAudioPath(data.audioPath);
      }
    });

    // Subscribe to socket events for transcription progress
    const unsubscribeTranscription = socketService.subscribeToTranscriptionProgress((data) => {
      console.log('Transcription progress:', data);
      setTranscriptionStatus(data);
      addLog(`Transcription: ${data.stage} (${data.progress}%) - ${data.message}`);

      // When transcription is complete, store the transcript
      if (data.stage === 'completed' && data.transcript) {
        setTranscript(data.transcript);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribeExtraction();
      unsubscribeTranscription();
    };
  }, []);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, `[${timestamp}] ${message}`]);
  };

  const handleUrlChange = (e) => {
    setVideoUrl(e.target.value);
  };

  const handleExtractAudio = async () => {
    if (!videoUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setExtractionStatus(null);
      setTranscriptionStatus(null);
      setAudioPath(null);
      setTranscript('');
      
      // Ensure we have a socket connection
      if (!socketService.isConnected()) {
        addLog('Socket not connected, reconnecting...');
        socketService.connect();
        // Wait a short time for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      addLog(`Starting audio extraction for: ${videoUrl}`);
      const response = await apiClient.extractAudio(videoUrl);
      
      addLog(`Extraction API response: ${JSON.stringify(response.data)}`);
      
      // Use audioFilePath from response if audioPath is not available
      const audioPathFromResponse = response.data.audioPath || response.data.audioFilePath;
      setAudioPath(audioPathFromResponse);
      
      addLog(`Audio path set to: ${audioPathFromResponse}`);
      
      // The progress updates will come through the socket connection
    } catch (err) {
      console.error('Error extracting audio:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Error extracting audio';
      setError(errorMsg);
      addLog(`Error: ${err.message}`);
      
      // Try to get more detailed error information if available
      if (err.response?.data?.details) {
        addLog(`Error details: ${err.response.data.details}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioPath) {
      setError('No audio file available. Extract audio first.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setTranscriptionStatus(null);
      setTranscript('');
      
      // Ensure we have a socket connection
      if (!socketService.isConnected()) {
        addLog('Socket not connected, reconnecting...');
        socketService.connect();
        // Wait a short time for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      addLog(`Starting transcription for audio: ${audioPath}`);
      
      // Make sure we're passing the correct information for the transcription
      const response = await apiClient.transcribeAudio({ 
        audioPath,
        // Also include videoUrl as a fallback, in case the server needs it
        videoUrl: videoUrl 
      });
      
      addLog(`Transcription API response: ${JSON.stringify(response.data)}`);
      
      // Check if we got a transcript in the response and set it
      if (response.data && response.data.transcript) {
        setTranscript(response.data.transcript);
        addLog(`Transcript received: ${response.data.transcript.length} characters`);
      } else {
        addLog('No transcript found in API response');
      }
      
      // The transcription progress updates will come through the socket connection
    } catch (err) {
      console.error('Error transcribing audio:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Error transcribing audio';
      setError(errorMsg);
      addLog(`Error: ${err.message}`);
      
      // Try to get more detailed error information if available
      if (err.response?.data?.details) {
        addLog(`Error details: ${err.response.data.details}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="recipe-extractor-tester">
      <h1>Recipe Extractor Tester</h1>
      
      <div className="input-section">
        <div className="url-input">
          <label htmlFor="video-url">YouTube URL:</label>
          <input 
            id="video-url"
            type="text" 
            value={videoUrl} 
            onChange={handleUrlChange}
            placeholder="Enter YouTube URL"
            disabled={isLoading}
          />
        </div>
        
        <div className="button-group">
          <button 
            onClick={handleExtractAudio} 
            disabled={isLoading || !videoUrl.trim()}
            className="primary-button"
          >
            Extract Audio
          </button>
          
          <button 
            onClick={handleTranscribe} 
            disabled={isLoading || !audioPath}
            className="primary-button"
          >
            Transcribe Audio
          </button>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      <div className="status-section">
        {extractionStatus && (
          <div className="progress-container">
            <h2>Audio Extraction</h2>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${extractionStatus.progress || 0}%` }}
              ></div>
              <span className="progress-label">{extractionStatus.progress || 0}%</span>
            </div>
            <div className="status-info">
              <p><strong>Stage:</strong> {extractionStatus.stage}</p>
              <p><strong>Message:</strong> {extractionStatus.message}</p>
              {audioPath && <p><strong>Audio Path:</strong> {audioPath}</p>}
            </div>
          </div>
        )}
        
        {transcriptionStatus && (
          <div className="progress-container">
            <h2>Transcription</h2>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${transcriptionStatus.progress || 0}%` }}
              ></div>
              <span className="progress-label">{transcriptionStatus.progress || 0}%</span>
            </div>
            <div className="status-info">
              <p><strong>Stage:</strong> {transcriptionStatus.stage}</p>
              <p><strong>Message:</strong> {transcriptionStatus.message}</p>
            </div>
          </div>
        )}
      </div>
      
      {transcript && (
        <div className="transcript-section">
          <h2>Transcript</h2>
          <div className="transcript-content">
            {transcript}
          </div>
        </div>
      )}
      
      <div className="logs-section">
        <h2>Activity Log</h2>
        <div className="logs-container">
          {logs.length === 0 ? (
            <p className="no-logs">No activity yet</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="log-entry">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeExtractorTester; 