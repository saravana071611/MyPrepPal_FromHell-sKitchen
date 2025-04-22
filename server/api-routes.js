/**
 * API Routes
 * 
 * This file defines the API endpoints for the MyPrepPal application
 */

const express = require('express');
const router = express.Router();
const MealPrepController = require('./meal-prep-controller');

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
  
  // In a real app, you would fetch the status from a database
  // For now, we'll return a mock response
  
  res.json({
    success: true,
    processingId,
    status: 'completed',
    result: {
      // Mock result data
      message: 'Processing completed successfully'
    }
  });
});

module.exports = router; 