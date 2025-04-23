/**
 * Test script for MealPrepService
 * 
 * This script tests both the video processing and direct transcription methods
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const MealPrepService = require('./meal-prep-service');

// Sample transcription for testing direct generation
const mockTranscription = `Hello everyone, welcome to my cooking channel. Today I'm going to show you how to make a delicious and healthy meal that's perfect for meal prep.

We'll start with some chicken breast, about 500 grams. Season it with salt, pepper, garlic powder, and paprika. Heat a tablespoon of olive oil in a pan over medium-high heat.

While the pan is heating, let's chop one onion, two cloves of garlic, and some bell peppers - one red and one yellow for color. Also prepare some broccoli florets and slice two medium carrots.

Once the pan is hot, add the chicken and cook for about 5-6 minutes on each side until golden brown and cooked through. Remove the chicken and set aside.

In the same pan, add the onions and garlic. Sauté for about 2 minutes until fragrant. Then add the bell peppers, carrots, and broccoli. Cook for another 5 minutes until vegetables start to soften but still have some crunch.

Now, slice the chicken into strips and add it back to the pan with the vegetables. Add a splash of soy sauce, a tablespoon of honey, and a teaspoon of sriracha for some heat. Stir everything together.

For serving, prepare some brown rice or quinoa. This recipe makes about 4-5 portions, perfect for your weekly meal prep. Each portion has approximately 30 grams of protein, 45 grams of carbs, and 12 grams of fat.

Store in airtight containers in the refrigerator for up to 4 days. Enjoy your healthy, delicious meal!`;

async function runDirectTranscriptionTest() {
  console.log('\n=== Testing direct transcription to meal prep ===');
  
  // Initialize the service
  const service = new MealPrepService({
    debug: true,
    resultsDir: path.join(__dirname, 'results/tests')
  });
  
  try {
    console.log('Generating meal prep from mock transcription...');
    console.time('Generation time');
    
    const result = await service.generateFromTranscription(mockTranscription);
    
    console.timeEnd('Generation time');
    
    if (result.success) {
      console.log('\n=== Success! ===');
      
      // Display the meal prep information summary
      console.log('\n=== MEAL PREP INFO SUMMARY ===');
      
      // Check if all sections are present
      const sections = ['feedback', 'groceryList', 'instructions', 'macros', 'storage'];
      let missingSections = sections.filter(section => !result.mealPrepInfo[section]);
      
      if (missingSections.length > 0) {
        console.log(`⚠️ Missing sections: ${missingSections.join(', ')}`);
      } else {
        console.log('✓ All sections present');
      }
      
      // Save result to file for inspection
      const outputPath = path.join(__dirname, 'results/tests', `direct_test_${Date.now()}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(result.mealPrepInfo, null, 2));
      console.log(`\nMeal prep data saved to: ${outputPath}`);
      
    } else {
      console.error('\n=== Failed! ===');
      console.error(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('\n=== Error! ===');
    console.error(`${error.message}`);
    console.error(error.stack);
  }
}

async function runVideoProcessingTest() {
  console.log('\n=== Testing meal prep from YouTube video ===');
  
  // Initialize the service
  const service = new MealPrepService({
    debug: true,
    resultsDir: path.join(__dirname, 'results/tests')
  });
  
  const videoUrl = 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Default test video
  const processingId = `test_${Date.now()}`;
  
  console.log(`Starting recipe processing with ID ${processingId}: ${videoUrl}`);
  console.time('Processing time');
  
  try {
    // Process the video with status callback
    const result = await service.processRecipe(
      videoUrl, 
      processingId, 
      (status) => {
        console.log(`Status: ${status.status}${status.message ? ' - ' + status.message : ''}`);
      }
    );
    
    console.timeEnd('Processing time');
    
    if (result.success) {
      console.log('\n=== Success! ===');
      console.log(`Output file: ${result.outputFilePath}`);
      
      // Check if all sections are present
      const sections = ['feedback', 'groceryList', 'instructions', 'macros', 'storage'];
      let missingSections = sections.filter(section => !result.mealPrepInfo[section]);
      
      if (missingSections.length > 0) {
        console.log(`⚠️ Missing sections: ${missingSections.join(', ')}`);
      } else {
        console.log('✓ All sections present');
      }
      
      // Save the test result to a different file for inspection
      const testOutputPath = path.join(__dirname, 'results/tests', `video_test_${Date.now()}.json`);
      fs.writeFileSync(testOutputPath, JSON.stringify(result.mealPrepInfo, null, 2));
      console.log(`\nTest meal prep data saved to: ${testOutputPath}`);
      
    } else {
      console.error('\n=== Failed! ===');
      console.error(`Error: ${result.error}`);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }
  } catch (error) {
    console.timeEnd('Processing time');
    console.error('\n=== Error! ===');
    console.error(`${error.message}`);
    console.error(error.stack);
  }
}

// Run tests
async function runTests() {
  // Create test results directory if it doesn't exist
  const testDir = path.join(__dirname, 'results/tests');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Choose which test to run (can be modified to run both sequentially)
  const testType = process.argv[2] || 'both';
  
  if (testType === 'direct' || testType === 'both') {
    await runDirectTranscriptionTest();
  }
  
  if (testType === 'video' || testType === 'both') {
    await runVideoProcessingTest();
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 