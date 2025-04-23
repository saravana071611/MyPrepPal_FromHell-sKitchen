import React from 'react';
import MealPrepGenerator from './MealPrepGenerator';
import Header from './Header';
import Footer from './Footer';

const MealPrepPage = () => {
  return (
    <div className="meal-prep-page">
      <Header />
      <div className="main-content">
        <h1>MyPrepPal - Gordon Ramsay's Meal Prep Assistant</h1>
        <p className="description">
          Transform any recipe video into a complete meal prep plan with Gordon Ramsay's expertise.
          Just paste a YouTube URL and get a detailed meal prep guide for 5 portions.
        </p>
        
        <MealPrepGenerator />
      </div>
      <Footer />
    </div>
  );
};

export default MealPrepPage; 