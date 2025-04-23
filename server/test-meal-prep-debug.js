/**
 * Test script for debugging meal prep generation issues
 */

require('dotenv').config();
const MealPrepController = require('./meal-prep-controller');
const fs = require('fs');
const path = require('path');

// Use a mock transcription if needed
const mockTranscription = `Hello everyone, welcome to my cooking channel. Today I'm going to show you how to make a delicious and healthy meal that's perfect for meal prep.

We'll start with some chicken breast, about 500 grams. Season it with salt, pepper, garlic powder, and paprika. Heat a tablespoon of olive oil in a pan over medium-high heat.

While the pan is heating, let's chop one onion, two cloves of garlic, and some bell peppers - one red and one yellow for color. Also prepare some broccoli florets and slice two medium carrots.

Once the pan is hot, add the chicken and cook for about 5-6 minutes on each side until golden brown and cooked through. Remove the chicken and set aside.

In the same pan, add the onions and garlic. Sauté for about 2 minutes until fragrant. Then add the bell peppers, carrots, and broccoli. Cook for another 5 minutes until vegetables start to soften but still have some crunch.

Now, slice the chicken into strips and add it back to the pan with the vegetables. Add a splash of soy sauce, a tablespoon of honey, and a teaspoon of sriracha for some heat. Stir everything together.

For serving, prepare some brown rice or quinoa. This recipe makes about 4-5 portions, perfect for your weekly meal prep. Each portion has approximately 30 grams of protein, 45 grams of carbs, and 12 grams of fat.

Store in airtight containers in the refrigerator for up to 4 days. Enjoy your healthy, delicious meal!`;

async function debugMealPrepGeneration() {
  console.log('=== MyPrepPal - Meal Prep Debugging ===');
  
  // Initialize controller with debugging enabled
  const controller = new MealPrepController({
    debug: true
  });
  
  console.log('\nStarting meal prep generation debug...');
  console.time('Total processing time');
  
  try {
    // First test direct generation from transcription text
    console.log('Testing direct Gordon review generation...');
    const gordonReview = await controller.getGordonReview(mockTranscription);
    
    // Save the gordon review to a file for inspection
    const reviewFilePath = path.join(__dirname, 'temp', 'debug_gordon_review.txt');
    fs.writeFileSync(reviewFilePath, gordonReview);
    console.log(`Gordon review saved to: ${reviewFilePath}`);
    
    // Test the complete flow with a video URL
    console.log('\nTesting complete flow with a YouTube video...');
    const videoUrl = 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Default test video
    
    // Status callback to show progress
    const statusCallback = (status) => {
      console.log(`Status: ${status.status}${status.message ? ' - ' + status.message : ''}`);
    };
    
    const result = await controller.processRecipeVideo(videoUrl, {
      statusCallback,
      useTranscriptionText: mockTranscription // Optional: use mock transcription instead of downloading
    });
    
    console.timeEnd('Total processing time');
    
    if (result.success) {
      console.log('\n=== Success! ===');
      console.log(`Output file: ${result.outputFilePath}`);
      
      // Display the meal prep information
      console.log('\n=== GORDON RAMSAY\'S MEAL PREP INSTRUCTIONS ===');
      
      console.log('\n--- RECIPE FEEDBACK ---');
      console.log(result.mealPrepInfo.feedback ? result.mealPrepInfo.feedback.substring(0, 100) + '...' : 'No feedback available');
      
      console.log('\n--- GROCERY LIST (5 PORTIONS) ---');
      console.log(result.mealPrepInfo.groceryList ? result.mealPrepInfo.groceryList.substring(0, 100) + '...' : 'No grocery list available');
      
      console.log('\n--- COOKING INSTRUCTIONS ---');
      console.log(result.mealPrepInfo.instructions ? result.mealPrepInfo.instructions.substring(0, 100) + '...' : 'No cooking instructions available');
      
      console.log('\n--- MACRO NUTRITIONAL INFORMATION ---');
      console.log(result.mealPrepInfo.macros ? result.mealPrepInfo.macros.substring(0, 100) + '...' : 'No macro information available');
      
      console.log('\n--- STORAGE AND REHEATING ---');
      console.log(result.mealPrepInfo.storage ? result.mealPrepInfo.storage.substring(0, 100) + '...' : 'No storage information available');
      
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

// Run the debug test
debugMealPrepGeneration().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 