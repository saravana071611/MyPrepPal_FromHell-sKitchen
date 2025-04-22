const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Create a small transcript to test the API
const smallTranscript = `
Hello everyone, welcome to my cooking channel. Today I'm going to show you how to make a delicious and healthy meal that's perfect for meal prep.

We'll start with some chicken breast, about 500 grams. Season it with salt, pepper, garlic powder, and paprika. Heat a tablespoon of olive oil in a pan over medium-high heat.

While the pan is heating, let's chop one onion, two cloves of garlic, and some bell peppers - one red and one yellow for color. Also prepare some broccoli florets and slice two medium carrots.

Once the pan is hot, add the chicken and cook for about 5-6 minutes on each side until golden brown and cooked through. Remove the chicken and set aside.

In the same pan, add the onions and garlic. Sauté for about 2 minutes until fragrant. Then add the bell peppers, carrots, and broccoli. Cook for another 5 minutes until vegetables start to soften but still have some crunch.

Now, slice the chicken into strips and add it back to the pan with the vegetables. Add a splash of soy sauce, a tablespoon of honey, and a teaspoon of sriracha for some heat. Stir everything together.

For serving, prepare some brown rice or quinoa. This recipe makes about 4-5 portions, perfect for your weekly meal prep. Each portion has approximately 30 grams of protein, 45 grams of carbs, and 12 grams of fat.
`;

// Example macro goals
const macroGoals = {
  protein: 150,
  carbs: 200,
  fats: 60,
  calories: 2000
};

// Timestamp for logging
const timestamp = () => new Date().toISOString();

async function testRecipeAnalysis() {
  console.log(`[${timestamp()}] Starting recipe analysis test with transcript length: ${smallTranscript.length} characters`);
  
  try {
    const response = await axios.post('http://localhost:5000/api/openai/recipe-analysis', {
      transcript: smallTranscript,
      macroGoals
    });
    
    console.log(`[${timestamp()}] API response received!`);
    console.log(`[${timestamp()}] Analysis length: ${response.data.analysis ? response.data.analysis.length : 0} characters`);
    
    // Save the result to a file for examination
    const resultPath = path.join(__dirname, 'test-result.json');
    fs.writeFileSync(resultPath, JSON.stringify(response.data, null, 2));
    console.log(`[${timestamp()}] Response saved to: ${resultPath}`);
    
    console.log(`[${timestamp()}] Test completed successfully`);
  } catch (error) {
    console.error(`[${timestamp()}] ERROR: ${error.message}`);
    
    // Log more detailed error information
    if (error.response) {
      console.error(`[${timestamp()}] Status: ${error.response.status}`);
      console.error(`[${timestamp()}] Data:`, error.response.data);
    }
  }
}

// Run the test
testRecipeAnalysis(); 