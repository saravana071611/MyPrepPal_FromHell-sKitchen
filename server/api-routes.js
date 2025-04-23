/**
 * API Routes
 * 
 * This file defines the API endpoints for the MyPrepPal application
 */

const express = require('express');
const router = express.Router();
const MealPrepService = require('./meal-prep-service');

// Initialize the MealPrepService
const mealPrepService = new MealPrepService({
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
    mealPrepService.processRecipe(videoUrl, processingId, (status) => {
      // In a real app, you would emit this status via websockets
      console.log(`[${processingId}] Status: ${status.status} - ${status.message || ''}`);
    })
    .catch(error => {
      console.error(`[${processingId}] Processing error:`, error);
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
    // Get processing status from service
    const status = mealPrepService.getProcessingStatus(processingId);
    return res.json(status);
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
    // Get meal prep data from service
    const mealPrepData = mealPrepService.getMealPrepData(processingId);
    
    if (mealPrepData.success) {
      return res.json(mealPrepData);
    } else {
      return res.status(404).json(mealPrepData);
    }
  } catch (error) {
    console.error(`Error retrieving meal prep data for ${processingId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving meal prep data'
    });
  }
});

/**
 * Generate meal prep from transcription text directly (for testing/debugging)
 * POST /api/generate-from-transcription
 * 
 * Request body:
 * {
 *   "transcription": "Transcription text goes here..."
 * }
 */
router.post('/generate-from-transcription', async (req, res) => {
  const { transcription } = req.body;
  
  if (!transcription) {
    return res.status(400).json({ 
      success: false, 
      error: 'Transcription text is required' 
    });
  }
  
  try {
    // Generate meal prep instructions from transcription text
    const result = await mealPrepService.generateFromTranscription(transcription);
    
    if (result.success) {
      return res.json({
        success: true,
        mealPrepInfo: result.mealPrepInfo
      });
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error generating from transcription:', error);
    return res.status(500).json({
      success: false,
      error: 'Error generating meal prep from transcription'
    });
  }
});

module.exports = router; 