/**
 * Test script for API process-recipe and meal-prep endpoints
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

async function testProcessRecipe() {
  console.log('=== Testing MyPrepPal API endpoints ===');
  
  const videoUrl = 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Default test video
  
  try {
    console.log(`\nStarting recipe processing for: ${videoUrl}`);
    
    // Call process-recipe endpoint
    const processResponse = await axios.post(`${API_URL}/process-recipe`, {
      videoUrl
    });
    
    if (!processResponse.data.success) {
      throw new Error(`Failed to start processing: ${processResponse.data.error}`);
    }
    
    const processingId = processResponse.data.processingId;
    console.log(`Processing started with ID: ${processingId}`);
    
    // Poll the status endpoint until processing is complete
    let status = 'processing';
    let attempts = 0;
    const maxAttempts = 15; // Try for about 5 minutes (15 attempts * 20 seconds)
    let resultData = null;
    
    console.log('\nPolling for status updates:');
    
    while (status === 'processing' && attempts < maxAttempts) {
      attempts++;
      
      try {
        // Wait for 20 seconds between status checks
        console.log(`Checking status (attempt ${attempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        // Call status endpoint
        const statusResponse = await axios.get(`${API_URL}/process-status/${processingId}`);
        status = statusResponse.data.status;
        
        console.log(`Status: ${status} - ${statusResponse.data.message || ''}`);
        resultData = statusResponse.data;
        
        if (status === 'completed' || status === 'failed' || status === 'error') {
          break;
        }
      } catch (error) {
        console.error(`Error checking status: ${error.message}`);
        continue;
      }
    }
    
    if (status === 'processing') {
      console.log('\nProcessing is taking too long. Last status:');
      console.log(resultData || { status: 'processing', message: 'Still processing after max attempts' });
      return;
    }
    
    if (status === 'failed' || status === 'error') {
      console.error('\nProcessing failed!');
      console.error(resultData);
      return;
    }
    
    console.log('\nProcessing completed successfully!');
    
    // Now get the meal prep data
    console.log('\nGetting meal prep data...');
    const mealPrepResponse = await axios.get(`${API_URL}/meal-prep/${processingId}`);
    
    if (!mealPrepResponse.data.success) {
      throw new Error(`Failed to get meal prep data: ${mealPrepResponse.data.error}`);
    }
    
    const mealPrepInfo = mealPrepResponse.data.mealPrepInfo;
    
    console.log('\n=== MEAL PREP INFO SUMMARY ===');
    
    // Check if all sections are present
    const sections = ['feedback', 'groceryList', 'instructions', 'macros', 'storage'];
    let missingSections = sections.filter(section => !mealPrepInfo[section]);
    
    if (missingSections.length > 0) {
      console.log(`⚠️ Missing sections: ${missingSections.join(', ')}`);
    } else {
      console.log('✓ All sections present');
    }
    
    // Save meal prep data to file for inspection
    const outputPath = path.join(__dirname, 'results', `test_meal_prep_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(mealPrepInfo, null, 2));
    console.log(`\nMeal prep data saved to: ${outputPath}`);
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testProcessRecipe().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 