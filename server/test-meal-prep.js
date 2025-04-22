/**
 * Test script for MealPrepController
 * 
 * This script demonstrates the complete flow:
 * 1. Extract audio from a YouTube video
 * 2. Transcribe it with Whisper API
 * 3. Send to Gordon Ramsay persona for recipe improvement
 * 4. Format and output the final meal prep instructions
 * 
 * Usage:
 * node test-meal-prep.js [youtube_url] [openai_api_key]
 */

require('dotenv').config();
const MealPrepController = require('./meal-prep-controller');

// Parse command line arguments
const args = process.argv.slice(2);
const videoUrl = args[0] || 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Default test video if none provided
const apiKey = args[1] || process.env.OPENAI_API_KEY;

// Ensure we have an API key
if (!apiKey) {
  console.error('ERROR: OpenAI API key is required. Provide it as a command line argument or set OPENAI_API_KEY in .env file.');
  process.exit(1);
}

async function runTest() {
  console.log('=== MyPrepPal - Hell\'s Kitchen Edition ===');
  console.log(`Video URL: ${videoUrl}`);
  
  // Initialize controller with debugging enabled
  const controller = new MealPrepController({
    apiKey,
    debug: true
  });
  
  // Status callback to show progress
  const statusCallback = (status) => {
    console.log(`Status: ${status.status}${status.message ? ' - ' + status.message : ''}`);
  };
  
  console.log('\nStarting meal prep process...');
  console.time('Total processing time');
  
  try {
    const result = await controller.processRecipeVideo(videoUrl, {
      statusCallback
    });
    
    console.timeEnd('Total processing time');
    
    if (result.success) {
      console.log('\n=== Success! ===');
      console.log(`Output file: ${result.outputFilePath}`);
      
      // Display the meal prep information
      console.log('\n=== GORDON RAMSAY\'S MEAL PREP INSTRUCTIONS ===');
      
      console.log('\n--- RECIPE FEEDBACK ---');
      console.log(result.mealPrepInfo.feedback || 'No feedback available');
      
      console.log('\n--- GROCERY LIST (5 PORTIONS) ---');
      console.log(result.mealPrepInfo.groceryList || 'No grocery list available');
      
      console.log('\n--- COOKING INSTRUCTIONS ---');
      console.log(result.mealPrepInfo.instructions || 'No cooking instructions available');
      
      console.log('\n--- MACRO NUTRITIONAL INFORMATION ---');
      console.log(result.mealPrepInfo.macros || 'No macro information available');
      
      console.log('\n--- STORAGE AND REHEATING ---');
      console.log(result.mealPrepInfo.storage || 'No storage information available');
      
      console.log('\n==============================================');
    } else {
      console.error('\n=== Failed! ===');
      console.error(`Error: ${result.error}`);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }
  } catch (error) {
    console.timeEnd('Total processing time');
    console.error('\n=== Error! ===');
    console.error(`${error.message}`);
    console.error(error.stack);
  }
}

// Run the test
runTest().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1); 
}); 