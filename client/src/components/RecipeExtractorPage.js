import React from 'react';
import RecipeExtractor from './RecipeExtractor';
import '../styles/RecipeExtractorPage.css';

const RecipeExtractorPage = () => {
  return (
    <div className="recipe-extractor-page">
      <div className="container">
        <div className="profile-header">
          <h1>Recipe Extractor</h1>
          <p>Extract recipes from cooking videos with Gordon Ramsay's guidance</p>
        </div>
        
        <div className="profile-content">
          <div className="content-container">
            <div className="header-avatar">
              <img 
                src="/images/gordon-ramsay.jpg" 
                alt="Gordon Ramsay" 
                className="ramsay-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/100x100?text=Chef";
                }}
              />
            </div>
            <RecipeExtractor />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeExtractorPage;