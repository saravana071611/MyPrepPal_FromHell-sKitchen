/**
 * API Routes
 * 
 * This file defines the API endpoints for the MyPrepPal application
 */

const express = require('express');
const router = express.Router();
const MealPrepController = require('./meal-prep-controller');
const path = require('path');
const fs = require('fs');

// Initialize the MealPrepController
const mealPrepController = new MealPrepController({
  debug: true
});

/**
 * Process a recipe video
 * POST /api/process-recipe
 * 
 * Request body:
 * {
 *   "videoUrl": "https://www.youtube.com/watch?v=xxxxx"
 * }
 */
router.post('/process-recipe', async (req, res) => {
  const { videoUrl } = req.body;
  
  if (!videoUrl) {
    return res.status(400).json({ 
      success: false, 
      error: 'Video URL is required' 
    });
  }
  
  try {
    // Start the processing
    const processingId = Date.now().toString();
    
    // Send immediate response
    res.status(202).json({
      success: true,
      message: 'Processing started',
      processingId
    });
    
    // Process the video (async)
    mealPrepController.processRecipeVideo(videoUrl, {
      statusCallback: (status) => {
        // In a real app, you would emit this status via websockets
        console.log(`[${processingId}] Status: ${status.status} - ${status.message || ''}`);
      }
    })
    .then(result => {
      // Store the result for later retrieval
      // In a real app, you would save this to a database
      console.log(`[${processingId}] Processing completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      // Save the result to a file for easy retrieval
      const resultsDir = path.join(__dirname, 'results');
      
      // Create results directory if it doesn't exist
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      // Save result data to a file
      fs.writeFileSync(
        path.join(resultsDir, `${processingId}.json`),
        JSON.stringify({
          id: processingId,
          status: result.success ? 'completed' : 'failed',
          message: result.success ? 'Recipe processing completed successfully' : result.error,
          result: {
            mealPrepInfo: result.mealPrepInfo,
            outputFilePath: result.outputFilePath,
            timestamp: new Date().toISOString()
          }
        }, null, 2)
      );
    })
    .catch(error => {
      console.error(`[${processingId}] Processing error:`, error);
      
      // Save error info to a file
      const resultsDir = path.join(__dirname, 'results');
      
      // Create results directory if it doesn't exist
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      // Save error data to a file
      fs.writeFileSync(
        path.join(resultsDir, `${processingId}.json`),
        JSON.stringify({
          id: processingId,
          status: 'error',
          message: error.message,
          error: error.stack,
          timestamp: new Date().toISOString()
        }, null, 2)
      );
    });
    
  } catch (error) {
    console.error('Error starting process:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Get processing status
 * GET /api/process-status/:id
 */
router.get('/process-status/:id', (req, res) => {
  const processingId = req.params.id;
  
  try {
    // Check if results file exists
    const resultsPath = path.join(__dirname, 'results', `${processingId}.json`);
    
    if (fs.existsSync(resultsPath)) {
      // Read and return the results
      const resultData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      return res.json(resultData);
    }
    
    // If no results file exists yet, check if processing is still ongoing
    // In a real app, you would check a database or queue system
    return res.json({
      id: processingId,
      status: 'processing',
      message: 'Recipe processing is in progress'
    });
  } catch (error) {
    console.error(`Error getting status for ${processingId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving processing status'
    });
  }
});

/**
 * Get meal prep data
 * GET /api/meal-prep/:id
 */
router.get('/meal-prep/:id', (req, res) => {
  const processingId = req.params.id;
  
  try {
    // Check if results file exists
    const resultsPath = path.join(__dirname, 'results', `${processingId}.json`);
    
    if (fs.existsSync(resultsPath)) {
      // Read the results
      const resultData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      // If processing completed successfully, return the meal prep info
      if (resultData.status === 'completed' && resultData.result && resultData.result.mealPrepInfo) {
        return res.json({
          success: true,
          id: processingId,
          mealPrepInfo: resultData.result.mealPrepInfo
        });
      }
      
      // If processing failed or is incomplete
      return res.status(404).json({
        success: false,
        error: `No meal prep data available for ID: ${processingId}`,
        status: resultData.status,
        message: resultData.message
      });
    }
    
    // If no results file exists
    return res.status(404).json({
      success: false,
      error: `No data found for ID: ${processingId}`
    });
  } catch (error) {
    console.error(`Error retrieving meal prep data for ${processingId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving meal prep data'
    });
  }
});

module.exports = router; 