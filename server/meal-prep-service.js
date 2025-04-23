/**
 * Meal Prep Service
 * 
 * This service handles the generation of meal prep instructions from recipe videos
 * It leverages the MealPrepController and provides a clean API for the application
 */

const path = require('path');
const fs = require('fs');
const MealPrepController = require('./meal-prep-controller');

class MealPrepService {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.resultsDir = options.resultsDir || path.join(__dirname, 'results');
    
    // Create results directory if it doesn't exist
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
    
    // Initialize the MealPrepController
    this.mealPrepController = new MealPrepController({
      debug: this.debug,
      tempDir: options.tempDir || path.join(__dirname, 'temp')
    });
    
    this.log('MealPrepService initialized');
  }
  
  /**
   * Start processing a recipe video
   * @param {string} videoUrl - The YouTube URL of the recipe video
   * @param {string} processingId - Unique ID for this processing job
   * @param {Function} statusCallback - Callback to receive status updates
   * @returns {Promise} - A promise that resolves when processing is complete
   */
  async processRecipe(videoUrl, processingId, statusCallback = () => {}) {
    this.log(`Starting recipe processing for ${processingId}: ${videoUrl}`);
    
    try {
      // Start the processing with the controller
      const result = await this.mealPrepController.processRecipeVideo(videoUrl, processingId);
      
      // Save the result for later retrieval
      this.saveProcessingResult(processingId, {
        status: 'completed',
        message: 'Recipe processing completed successfully',
        result: {
          mealPrepInfo: result,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        success: true,
        mealPrepInfo: result
      };
    } catch (error) {
      this.log(`Error processing recipe: ${error.message}`, true);
      
      // Save error info
      this.saveProcessingResult(processingId, {
        status: 'error',
        message: error.message,
        error: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get the current status of a processing job
   * @param {string} processingId - The ID of the processing job
   * @returns {Object} - Status information
   */
  getProcessingStatus(processingId) {
    this.log(`Getting status for ${processingId}`);
    
    try {
      // Check if results file exists
      const resultsPath = path.join(this.resultsDir, `${processingId}.json`);
      
      if (fs.existsSync(resultsPath)) {
        // Read and return the results
        return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      }
      
      // If no results file exists yet, processing is still ongoing
      return {
        id: processingId,
        status: 'processing',
        message: 'Recipe processing is in progress'
      };
    } catch (error) {
      this.log(`Error getting status for ${processingId}: ${error.message}`, true);
      throw error;
    }
  }
  
  /**
   * Get meal prep data for a completed processing job
   * @param {string} processingId - The ID of the processing job
   * @returns {Object} - Meal prep information
   */
  getMealPrepData(processingId) {
    this.log(`Getting meal prep data for ${processingId}`);
    
    try {
      // Check if results file exists
      const resultsPath = path.join(this.resultsDir, `${processingId}.json`);
      
      if (fs.existsSync(resultsPath)) {
        // Read the results
        const resultData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        // If processing completed successfully, return the meal prep info
        if (resultData.status === 'completed' && resultData.result && resultData.result.mealPrepInfo) {
          return {
            success: true,
            id: processingId,
            mealPrepInfo: resultData.result.mealPrepInfo
          };
        }
        
        // If processing failed or is incomplete
        return {
          success: false,
          error: `No meal prep data available for ID: ${processingId}`,
          status: resultData.status,
          message: resultData.message
        };
      }
      
      // If no results file exists
      return {
        success: false,
        error: `No data found for ID: ${processingId}`
      };
    } catch (error) {
      this.log(`Error retrieving meal prep data for ${processingId}: ${error.message}`, true);
      throw error;
    }
  }
  
  /**
   * Generate meal prep instructions directly from transcription text
   * This is useful for debugging or bypassing the video extraction step
   * @param {string} transcriptionText - The recipe transcription text
   * @returns {Object} - Meal prep information
   */
  async generateFromTranscription(transcriptionText) {
    this.log('Generating meal prep from transcription text');
    
    try {
      // Generate Gordon's review (still needed to generate other content)
      const gordonReview = await this.mealPrepController.getGordonReview(transcriptionText);
      
      // Get a structured grocery list
      const structuredGroceryList = await this.mealPrepController.getStructuredGroceryList(gordonReview);
      
      // Get detailed cooking method
      const detailedCookingMethod = await this.mealPrepController.getDetailedCookingMethod(gordonReview);
      
      // Combine only grocery list and cooking method
      const mealPrepInfo = {
        groceryList: structuredGroceryList,
        cookingMethod: detailedCookingMethod
      };
      
      return {
        success: true,
        mealPrepInfo
      };
    } catch (error) {
      this.log(`Error generating from transcription: ${error.message}`, true);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Save processing result to file
   * @param {string} processingId - The ID of the processing job
   * @param {Object} data - The data to save
   */
  saveProcessingResult(processingId, data) {
    this.log(`Saved processing result for ${processingId}`);
    
    try {
      const filePath = path.join(this.resultsDir, `${processingId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      this.log(`Error saving processing result: ${error.message}`, true);
    }
  }
  
  /**
   * Logging helper
   * @param {string} message - The message to log
   * @param {boolean} isError - Whether this is an error message
   */
  log(message, isError = false) {
    if (this.debug) {
      if (isError) {
        console.error(`[MealPrepService] ${message}`);
      } else {
        console.log(`[MealPrepService] ${message}`);
      }
    }
  }
}

module.exports = MealPrepService; 