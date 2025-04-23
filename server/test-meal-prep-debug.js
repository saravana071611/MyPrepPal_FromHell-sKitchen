/**
 * Test script for debugging meal prep generation issues
 */

require('dotenv').config();
const MealPrepController = require('./meal-prep-controller');
const fs = require('fs');
const path = require('path');

// Use a mock transcription if needed
const mockTranscription = `Hello everyone, welcome to my cooking channel. Today I'm going to show you how to make a chicken pot pie.

For this recipe, you'll need:
- 1 rotisserie chicken, shredded
- 1 cup of frozen peas
- 8 ounces of mushrooms, sliced
- 1 medium onion, chopped
- 2 carrots, diced
- 3 tablespoons of butter
- 1/3 cup of all-purpose flour
- 2 cups of chicken broth
- 1/2 cup of heavy cream
- 1 tablespoon of fresh parsley, chopped
- Salt and pepper to taste
- 2 pie crusts (top and bottom)

Let's start by preheating the oven to 400°F.

In a large pot, melt the butter over medium heat. Add the onions and carrots and cook for about 8 minutes until they start to soften.

Add the mushrooms and continue cooking for another 5 minutes.

Sprinkle the flour over the vegetables and cook, stirring constantly, for about 2 minutes.

Slowly pour in the chicken broth and heavy cream, stirring continuously until the mixture thickens.

Add the shredded chicken, peas, and parsley. Season with salt and pepper to taste.

Line a pie dish with one of the pie crusts, pour in the filling, then top with the second crust. Crimp the edges to seal and cut a few slits in the top crust to allow steam to escape.

Bake for 30-35 minutes until the crust is golden brown.

Let it cool for 10 minutes before serving.

This makes a delicious and comforting meal that's perfect for family dinners.`;

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
    console.log('\nGenerating Gordon\'s review...');
    const gordonReview = await controller.getGordonReview(mockTranscription);
    
    // Save the gordon review to a file for inspection
    const reviewFilePath = path.join(__dirname, 'temp', 'debug_gordon_review.txt');
    fs.writeFileSync(reviewFilePath, gordonReview);
    console.log(`Gordon review saved to: ${reviewFilePath}`);
    
    // Generate detailed feedback
    console.log('\nGenerating detailed recipe feedback...');
    const recipeFeedback = await controller.getRecipeFeedback(
      mockTranscription, 
      gordonReview
    );
    
    // Generate macro analysis
    console.log('\nGenerating macro nutritional analysis...');
    const macroAnalysis = await controller.getMacroAnalysis(gordonReview);
    
    // Generate grocery list
    console.log('\nGenerating structured grocery list...');
    const structuredGroceryList = await controller.getStructuredGroceryList(gordonReview);
    
    // Generate cooking method
    console.log('\nGenerating detailed cooking method...');
    const detailedCookingMethod = await controller.getDetailedCookingMethod(gordonReview);
    
    // Generate storage instructions
    console.log('\nGenerating storage instructions...');
    const storageInstructions = await controller.getStorageInstructions(gordonReview);
    
    // Combine all information
    const mealPrepInfo = {
      raw: gordonReview,
      feedback: recipeFeedback,
      groceryList: structuredGroceryList,
      instructions: detailedCookingMethod,
      macros: macroAnalysis,
      storage: storageInstructions
    };
    
    // Save the meal prep info to a file
    const outputPath = path.join(__dirname, 'results', `test_meal_prep_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(mealPrepInfo, null, 2));
    
    console.timeEnd('Total processing time');
    console.log(`\nMeal prep data saved to: ${outputPath}`);
    
    // Display the meal prep information summary
    console.log('\n=== GORDON RAMSAY\'S MEAL PREP INSTRUCTIONS ===');
    
    console.log('\n--- RECIPE FEEDBACK ---');
    console.log(recipeFeedback ? recipeFeedback.substring(0, 100) + '...' : 'No feedback available');
    
    console.log('\n--- GROCERY LIST (5 PORTIONS) ---');
    console.log(structuredGroceryList ? structuredGroceryList.substring(0, 100) + '...' : 'No grocery list available');
    
    console.log('\n--- COOKING INSTRUCTIONS ---');
    console.log(detailedCookingMethod ? detailedCookingMethod.substring(0, 100) + '...' : 'No cooking instructions available');
    
    console.log('\n--- MACRO NUTRITIONAL INFORMATION ---');
    console.log(macroAnalysis ? macroAnalysis.substring(0, 100) + '...' : 'No macro information available');
    
    console.log('\n--- STORAGE AND REHEATING ---');
    console.log(storageInstructions ? storageInstructions.substring(0, 100) + '...' : 'No storage information available');
    
    console.log('\n==============================================');
    
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