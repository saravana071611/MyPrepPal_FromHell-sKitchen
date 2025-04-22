import React from 'react';
import ExtractAndPrep from './ExtractAndPrep';
import '../styles/RecipeExtractorPage.css';

const ExtractAndPrepPage = () => {
  return (
    <div className="recipe-extractor-page">
      <div className="container">
        <div className="profile-header">
          <h1>Extract & Prep</h1>
          <p>Get complete meal prep instructions from cooking videos with Gordon Ramsay's expertise</p>
        </div>
        
        <div className="profile-content">
          <div className="content-container">
            <ExtractAndPrep />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtractAndPrepPage; 