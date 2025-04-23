import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import apiClient from './utils/api';
import { SocketProvider } from './contexts/SocketContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import UserProfilePage from './components/UserProfilePage';
import ExtractAndPrepPage from './components/ExtractAndPrepPage';

// Styles
import './styles/App.css';

function App() {
  const [apiStatus, setApiStatus] = useState({
    openai: 'Checking...',
    youtube: 'Checking...'
  });

  // Function to refresh API status
  const refreshApiStatus = async () => {
    // Set to "Checking..." state to provide immediate visual feedback
    setApiStatus({
      openai: 'Checking...',
      youtube: 'Checking...'
    });
    
    try {
      // Add a small delay to make the checking state visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await apiClient.getApiStatus();
      setApiStatus(response.data);
      return response.data; // Return data in case caller needs it
    } catch (error) {
      console.error('Error checking API status:', error);
      setApiStatus({
        openai: 'Disconnected',
        youtube: 'Disconnected',
        error: error.message
      });
      return null;
    }
  };

  // Check API status on component mount
  useEffect(() => {
    refreshApiStatus();
  }, []);

  return (
    <SocketProvider>
      <div className="app">
        <Header />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage apiStatus={apiStatus} refreshApiStatus={refreshApiStatus} />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/extract-and-prep" element={<ExtractAndPrepPage />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </SocketProvider>
  );
}

export default App;