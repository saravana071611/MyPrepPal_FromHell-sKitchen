import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import UserProfilePage from './components/UserProfilePage';
import RecipeExtractorPage from './components/RecipeExtractorPage';

// Styles
import './styles/App.css';

function App() {
  const [apiStatus, setApiStatus] = useState({
    openai: 'Checking...',
    youtube: 'Checking...'
  });

  // Function to check API status
  const refreshApiStatus = async () => {
    setApiStatus({
      openai: 'Checking...',
      youtube: 'Checking...'
    });
    
    try {
      const response = await axios.get('/api/status');
      setApiStatus(response.data);
    } catch (error) {
      console.error('Error checking API status:', error);
      setApiStatus({
        openai: 'Disconnected',
        youtube: 'Disconnected'
      });
    }
  };

  // Check API status on component mount
  useEffect(() => {
    refreshApiStatus();
  }, []);

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage apiStatus={apiStatus} refreshApiStatus={refreshApiStatus} />} />
          <Route path="/profile" element={<UserProfilePage />} />
          <Route path="/recipe-extractor" element={<RecipeExtractorPage />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;