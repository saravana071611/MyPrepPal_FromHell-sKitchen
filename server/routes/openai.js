const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Directory to store user profiles
const PROFILES_DIR = path.join(__dirname, '../data/profiles');

// Check if OpenAI API key is available
const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;

// Debug function
const debug = (message, obj = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [OpenAI Debug] ${message}`);
  if (obj) {
    console.log(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
  }
};

// Log API key info (safely)
if (hasApiKey) {
  const keyFirstFour = process.env.OPENAI_API_KEY.substring(0, 4);
  const keyLastFour = process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4);
  debug(`OpenAI API Key loaded: ${keyFirstFour}...${keyLastFour}`);
  debug(`Key length: ${process.env.OPENAI_API_KEY.length} characters`);
} else {
  debug('No OpenAI API key found - mock mode will be used');
}

// OpenAI Configuration - only create if API key exists
let openai = null;
try {
  if (hasApiKey) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    debug('OpenAI client initialized successfully');
  }
} catch (error) {
  debug('Error initializing OpenAI client:', error.message);
}

// Route to get AI fitness assessment (combined Rock and Ramsay personas)
router.post('/fitness-assessment', async (req, res) => {
  debug('Received fitness assessment request with data:', {
    userId: req.body.userId,
    dataProvided: Object.keys(req.body).join(', ')
  });
  
  try {
    const { userId, age, gender, currentWeight, currentHeight, activityLevel, targetWeight } = req.body;
    
    if (!userId) {
      debug('Missing userId in request');
      return res.status(400).json({ error: 'User ID is required for fitness assessment' });
    }
    
    // Validate input values
    if (!age || !gender || !currentWeight || !currentHeight || !activityLevel || !targetWeight) {
      debug('Missing required profile data', req.body);
      return res.status(400).json({ error: 'All profile fields are required' });
    }
    
    // Mock data if no OpenAI API key is available
    if (!hasApiKey || !openai) {
      debug('Using mock data because OpenAI API key is not available or client initialization failed');
      
      // Create mock assessment based on user data
      const bmi = (currentWeight / ((currentHeight / 100) * (currentHeight / 100))).toFixed(1);
      const weightDiff = currentWeight - targetWeight;
      const isWeightLoss = weightDiff > 0;
      
      let mockAssessment = '';
      
      // Gordon Ramsay's part (now first) - Focus on diet and weight
      mockAssessment += `**GORDON RAMSAY:**\n`;
      mockAssessment += `LISTEN UP! You need to ${isWeightLoss ? 'lose' : 'gain'} ${Math.abs(weightDiff)}kg and your diet is CRITICAL. With a BMI of ${bmi}, ${bmi > 25 ? "your current eating habits are KILLING your progress!" : bmi < 18.5 ? "you're DANGEROUSLY underweight!" : "you need to focus on QUALITY!"}\n\n`;
      mockAssessment += `THREE STEPS:\n1. ELIMINATE processed junk! No more sugary drinks, fast food, or packaged snacks - they're GARBAGE.\n2. INCREASE protein - lean meats, fish, eggs. ${currentWeight > 100 ? "PORTION CONTROL is essential!" : "Don't skimp on portion sizes!"}\n3. VEGETABLES with EVERY meal. No excuses! Green veg is non-negotiable.\n\n`;
      mockAssessment += `MEAL PLAN:\n• Breakfast: ${isWeightLoss ? "Egg white omelette with spinach" : "Whole eggs with avocado toast"}\n• Lunch: Grilled chicken breast, steamed broccoli, ${isWeightLoss ? "¼ cup brown rice" : "1 cup brown rice"}\n• Dinner: Baked salmon, asparagus, ${isWeightLoss ? "small sweet potato" : "large sweet potato"}\n• Snack: Greek yogurt with berries ${isWeightLoss ? "(measure it!)" : "and a handful of nuts"}\n\nSTICK TO THIS PLAN or don't bother asking for my help again!\n\n`;
      
      // The Rock's part - Focus on exercise frequency and concrete steps
      mockAssessment += `**THE ROCK:**\n`;
      mockAssessment += `FOCUS. DISCIPLINE. CONSISTENCY. That's how you'll transform your ${age}-year-old, ${gender} body from ${currentWeight}kg to ${targetWeight}kg.\n\n`;
      mockAssessment += `YOUR WORKOUT SCHEDULE - NO NEGOTIATION:\n• Monday: PUSH - Chest/shoulders/triceps - 4×10 reps, 60sec rest\n• Tuesday: 35min HIIT cardio + core (4 rounds of 45sec work/15sec rest)\n• Wednesday: PULL - Back/biceps - 4×10 reps, 60sec rest\n• Thursday: Active recovery - 30min walk + stretching\n• Friday: LEGS - Squats/lunges/deadlifts - 4×10 reps, 75sec rest\n• Saturday: 45min steady cardio + mobility work\n• Sunday: FULL REST (but meal prep for the week!)\n\n`;
      mockAssessment += `THE BOTTOM LINE: Train 5-6 days/week. Progressive overload - add weight or reps each week. Track EVERYTHING. ${isWeightLoss ? "You didn't gain this weight overnight, and you won't lose it overnight." : "Building quality muscle takes time and consistency."} COMMIT to the process!\n\n`;
      
      // Mock macro goals with actual numbers instead of strings
      const mockMacroGoals = {
        protein: Math.round(currentWeight * (isWeightLoss ? 2.2 : 1.8)),
        carbs: Math.round(currentWeight * (isWeightLoss ? 2 : 3)),
        fats: Math.round(currentWeight * (isWeightLoss ? 0.8 : 1)),
        calories: Math.round(currentWeight * (isWeightLoss ? 22 : 28))
      };
      
      // Ensure these are numbers, not strings
      Object.keys(mockMacroGoals).forEach(key => {
        if (typeof mockMacroGoals[key] !== 'number' || isNaN(mockMacroGoals[key])) {
          // Set default values if not a valid number
          const defaults = { protein: 130, carbs: 150, fats: 60, calories: 1800 };
          mockMacroGoals[key] = defaults[key] || 0;
        }
      });
      
      // Add macro goals to the assessment
      mockAssessment += `**MACRO GOALS:**\n`;
      mockAssessment += `Protein: ${mockMacroGoals.protein} grams per day\n`;
      mockAssessment += `Carbs: ${mockMacroGoals.carbs} grams per day\n`;
      mockAssessment += `Fats: ${mockMacroGoals.fats} grams per day\n`;
      mockAssessment += `Calories: ${mockMacroGoals.calories} calories per day`;
      
      // Store the macro goals in the user profile
      try {
        const filePath = path.join(PROFILES_DIR, `${userId}.json`);
        
        if (fs.existsSync(filePath)) {
          const userProfileRaw = fs.readFileSync(filePath, 'utf8');
          const userProfile = JSON.parse(userProfileRaw);
          
          // Update profile with macro goals
          userProfile.macroGoals = mockMacroGoals;
          userProfile.updatedAt = new Date().toISOString();
          
          fs.writeFileSync(filePath, JSON.stringify(userProfile, null, 2));
          debug('User profile updated with mock macro goals');
        } else {
          debug('User profile not found for storing macro goals');
        }
      } catch (error) {
        debug('Error updating user profile with macro goals:', error.message);
      }
      
      return res.json({
        assessment: mockAssessment,
        macroGoals: mockMacroGoals
      });
    }
    
    // If we have an API key, proceed with the actual OpenAI call
    debug('Preparing OpenAI request for fitness assessment');
    
    // Construct the prompt
    const systemContent = "You are a fitness expert with two personas: Dwayne 'The Rock' Johnson and Gordon Ramsay. " +
      "Format their names in bold (e.g., **GORDON RAMSAY:**) at the beginning of their sections. " + 
      "Put Gordon Ramsay's section FIRST, followed by The Rock's section. " +
      "As Gordon Ramsay, provide brutally honest DIETARY feedback focusing on the user's weight goals. Be concise, direct, and incorporate mild profanity. Focus on exactly what foods to eat/avoid with specific portions and meal timing. " +
      "As The Rock, provide specific WORKOUT advice with exact exercise frequency, sets, reps and rest periods. Be motivational but direct, focusing on consistency and discipline. " +
      "Always include specific macro goals (protein, carbs, fats) in your response and structure them clearly. " +
      "Keep responses sharp, actionable and personality-driven.";
      
    const userContent = `A user with the following profile has requested a fitness assessment:
    - Age: ${age}
    - Gender: ${gender}
    - Current Weight: ${currentWeight}kg
    - Current Height: ${currentHeight}cm
    - Activity Level: ${activityLevel}
    - Target Weight: ${targetWeight}kg
    
    First section (GORDON RAMSAY):
    - Start with "**GORDON RAMSAY:**" in bold
    - Focus EXCLUSIVELY on DIET and NUTRITION to help them reach their weight goal
    - Directly address their need to ${currentWeight > targetWeight ? 'LOSE' : 'GAIN'} ${Math.abs(currentWeight - targetWeight)}kg
    - Provide exactly THREE clear, actionable diet steps with specific foods to eat and avoid
    - Include a SPECIFIC meal plan with breakfast, lunch, dinner and snack options
    - Be direct, brutally honest, and use some mild profanity for emphasis
    - Keep this section focused on FOOD and DIET only - do not mention exercise
    
    Second section (THE ROCK): 
    - Start with "**THE ROCK:**" in bold
    - Focus EXCLUSIVELY on EXERCISE and TRAINING to help them reach their weight goal
    - Provide a SPECIFIC 7-day workout schedule with exact exercises, sets, reps and rest periods
    - Include direct, motivational language about consistency and discipline
    - End with a clear bottom-line message about training frequency and commitment
    - Keep this section focused on WORKOUTS and FITNESS only - do not discuss diet
    
    IMPORTANT: Always format the macro goals in this exact structure in a separate section:
    **MACRO GOALS:**
    Protein: X grams per day
    Carbs: Y grams per day
    Fats: Z grams per day
    Calories: W calories per day
    
    CRITICAL: Keep both sections concise, direct and focused on their specific areas - Gordon on diet/nutrition and The Rock on workouts/training.`;
    
    debug('Sending request to OpenAI with model: gpt-3.5-turbo');
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Changed from gpt-4 to gpt-3.5-turbo
        messages: [
          {
            role: "system",
            content: systemContent
          },
          {
            role: "user",
            content: userContent
          }
        ],
        max_tokens: 2000, // Increased from 1000 to 2000
        temperature: 0.3, // Lower temperature for more consistent output
      });
      
      debug('Received response from OpenAI');
      
      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        debug('Invalid response structure from OpenAI:', response);
        throw new Error('Received invalid response structure from OpenAI');
      }
      
      const fullAssessment = response.choices[0].message.content.trim();
      debug('Response content length: ' + fullAssessment.length + ' characters');
      
      // Extract the macro goals from the response
      let macroGoals = {};
      const macroSection = fullAssessment.split('**MACRO GOALS:**');
      
      if (macroSection.length > 1) {
        const macroText = macroSection[1].trim();
        debug('Found macro goals section:', macroText);
        const macroLines = macroText.split('\n');
        
        macroLines.forEach(line => {
          if (line.includes('Protein:')) {
            let proteinValue = line.split('Protein:')[1].trim().split(' ')[0];
            // Remove 'g' if it exists in the value and ensure it's a number
            proteinValue = proteinValue.replace(/\D/g, '');
            // Convert to number or use a default value of 130 if empty
            macroGoals.protein = proteinValue ? parseInt(proteinValue, 10) : 130;
          } else if (line.includes('Carbs:')) {
            let carbsValue = line.split('Carbs:')[1].trim().split(' ')[0];
            // Remove 'g' if it exists in the value and ensure it's a number
            carbsValue = carbsValue.replace(/\D/g, '');
            // Convert to number or use a default value of 150 if empty
            macroGoals.carbs = carbsValue ? parseInt(carbsValue, 10) : 150;
          } else if (line.includes('Fats:')) {
            let fatsValue = line.split('Fats:')[1].trim().split(' ')[0];
            // Remove 'g' if it exists in the value and ensure it's a number
            fatsValue = fatsValue.replace(/\D/g, '');
            // Convert to number or use a default value of 60 if empty
            macroGoals.fats = fatsValue ? parseInt(fatsValue, 10) : 60;
          } else if (line.includes('Calories:')) {
            let caloriesValue = line.split('Calories:')[1].trim().split(' ')[0];
            // Ensure it's a number
            caloriesValue = caloriesValue.replace(/\D/g, '');
            // Convert to number or use a default value of 1800 if empty
            macroGoals.calories = caloriesValue ? parseInt(caloriesValue, 10) : 1800;
          }
        });
        
        debug('Extracted macro goals:', macroGoals);
      } else {
        // Try the old format if the new format isn't found
        const oldMacroSection = fullAssessment.split('MACRO_GOALS:');
        if (oldMacroSection.length > 1) {
          const macroText = oldMacroSection[1].trim();
          debug('Found macro goals section (old format):', macroText);
          const macroLines = macroText.split('\n');
          
          macroLines.forEach(line => {
            if (line.includes('Protein:')) {
              let proteinValue = line.split('Protein:')[1].trim().split(' ')[0];
              // Remove 'g' if it exists in the value and ensure it's a number
              proteinValue = proteinValue.replace(/\D/g, '');
              // Convert to number or use a default value of 130 if empty
              macroGoals.protein = proteinValue ? parseInt(proteinValue, 10) : 130;
            } else if (line.includes('Carbs:')) {
              let carbsValue = line.split('Carbs:')[1].trim().split(' ')[0];
              // Remove 'g' if it exists in the value and ensure it's a number
              carbsValue = carbsValue.replace(/\D/g, '');
              // Convert to number or use a default value of 150 if empty
              macroGoals.carbs = carbsValue ? parseInt(carbsValue, 10) : 150;
            } else if (line.includes('Fats:')) {
              let fatsValue = line.split('Fats:')[1].trim().split(' ')[0];
              // Remove 'g' if it exists in the value and ensure it's a number
              fatsValue = fatsValue.replace(/\D/g, '');
              // Convert to number or use a default value of 60 if empty
              macroGoals.fats = fatsValue ? parseInt(fatsValue, 10) : 60;
            } else if (line.includes('Calories:')) {
              let caloriesValue = line.split('Calories:')[1].trim().split(' ')[0];
              // Ensure it's a number
              caloriesValue = caloriesValue.replace(/\D/g, '');
              // Convert to number or use a default value of 1800 if empty
              macroGoals.calories = caloriesValue ? parseInt(caloriesValue, 10) : 1800;
            }
          });
          
          debug('Extracted macro goals (old format):', macroGoals);
        } else {
          debug('No macro goals section found in response. Full response:', fullAssessment);
          // Create default macro goals based on basic calculations if missing
          const bmi = (currentWeight / ((currentHeight / 100) * (currentHeight / 100))).toFixed(1);
          const weightDiff = currentWeight - targetWeight;
          const isWeightLoss = weightDiff > 0;
          
          macroGoals = {
            protein: Math.round(currentWeight * (isWeightLoss ? 2.2 : 1.8)),
            carbs: Math.round(currentWeight * (isWeightLoss ? 2 : 3)),
            fats: Math.round(currentWeight * (isWeightLoss ? 0.8 : 1)),
            calories: Math.round(currentWeight * (isWeightLoss ? 22 : 28))
          };
          
          debug('Using fallback macro goals:', macroGoals);
        }
      }
      
      // Store the macro goals in the user profile
      try {
        const filePath = path.join(PROFILES_DIR, `${userId}.json`);
        
        if (fs.existsSync(filePath)) {
          const userProfileRaw = fs.readFileSync(filePath, 'utf8');
          const userProfile = JSON.parse(userProfileRaw);
          
          // Update profile with macro goals
          userProfile.macroGoals = macroGoals;
          userProfile.updatedAt = new Date().toISOString();
          
          fs.writeFileSync(filePath, JSON.stringify(userProfile, null, 2));
          debug('User profile updated with macro goals');
        } else {
          debug('User profile not found for storing macro goals');
        }
      } catch (error) {
        debug('Error updating user profile with macro goals:', error.message);
      }
      
      debug('Sending successful response to client');
      res.json({ 
        assessment: fullAssessment,
        macroGoals: macroGoals
      });
      
    } catch (openaiError) {
      debug('Error in OpenAI API call:', openaiError);
      debug('Error details:', openaiError.message);
      
      if (openaiError.response) {
        debug('OpenAI API response status:', openaiError.response.status);
        debug('OpenAI API response headers:', openaiError.response.headers);
        debug('OpenAI API response data:', openaiError.response.data);
      }
      
      // Handle common OpenAI errors with more specific messages
      let errorMessage = 'Unknown error with OpenAI API';
      
      if (openaiError.message.includes('model')) {
        errorMessage = 'Model gpt-3.5-turbo is not available for your account. Try updating to a different model.';
      } else if (openaiError.message.includes('rate limit')) {
        errorMessage = 'OpenAI rate limit exceeded. Please try again in a few minutes.';
      } else if (openaiError.message.includes('timeout')) {
        errorMessage = 'OpenAI request timed out. The service might be experiencing high traffic.';
      } else if (openaiError.message.includes('billing')) {
        errorMessage = 'OpenAI billing issue. Please check your account balance.';
      } else if (openaiError.message.includes('maximum context length') || openaiError.message.includes('token limit')) {
        // Special handling for token limit errors - provide more detailed fallback
        debug('Token limit exceeded - using fallback assessment');
        
        // Generate a fallback assessment
        const bmi = (currentWeight / ((currentHeight / 100) * (currentHeight / 100))).toFixed(1);
        const weightDiff = currentWeight - targetWeight;
        const isWeightLoss = weightDiff > 0;
        
        let fallbackAssessment = '';
        
        // Gordon Ramsay's part (now first) - Focus on diet and weight
        fallbackAssessment += `**GORDON RAMSAY:**\n`;
        fallbackAssessment += `WAKE UP! You need to ${isWeightLoss ? 'lose' : 'gain'} ${Math.abs(weightDiff)}kg and your BMI is ${bmi}. Your current diet is ABSOLUTE GARBAGE!\n\n`;
        fallbackAssessment += `DO THIS NOW:\n1. Cut ALL processed foods - they're KILLING your progress\n2. Lean proteins with EVERY meal - chicken, fish, eggs\n3. Triple your vegetable intake - greens at EVERY meal\n\nSimple meal plan: Protein + vegetables + small portion of complex carbs. Eat clean 90% of the time. NO EXCUSES!\n\n`;
        
        // The Rock's part - Focus on exercise frequency and concrete steps
        fallbackAssessment += `**THE ROCK:**\n`;
        fallbackAssessment += `BOTTOM LINE: You're going to ${isWeightLoss ? 'LOSE' : 'GAIN'} those ${Math.abs(weightDiff)}kg with FOCUS and CONSISTENCY. No shortcuts!\n\n`;
        fallbackAssessment += `YOUR WEEKLY PLAN - NON-NEGOTIABLE:\n• 3-4 days strength training (45-60 min sessions)\n• 2 days cardio (30 min HIIT or 45 min steady state)\n• 1 day active recovery (walking/stretching)\n• 1 day complete rest\n\nPROGRESSIVE OVERLOAD: Add weight or reps each week. Your body adapts, so you must push harder. NO EXCUSES! Track every workout!\n\n`;
        fallbackAssessment += `REMEMBER: The gym is the easy part. The kitchen is where results happen. Stick to your macros and BE CONSISTENT!\n\n`;
        
        // Fallback macro goals as actual numbers
        const fallbackMacroGoals = {
          protein: Math.round(currentWeight * (isWeightLoss ? 2.2 : 1.8)),
          carbs: Math.round(currentWeight * (isWeightLoss ? 2 : 3)),
          fats: Math.round(currentWeight * (isWeightLoss ? 0.8 : 1)),
          calories: Math.round(currentWeight * (isWeightLoss ? 22 : 28))
        };
        
        // Ensure these are numbers, not strings
        Object.keys(fallbackMacroGoals).forEach(key => {
          if (typeof fallbackMacroGoals[key] !== 'number' || isNaN(fallbackMacroGoals[key])) {
            // Set default values if not a valid number
            const defaults = { protein: 130, carbs: 150, fats: 60, calories: 1800 };
            fallbackMacroGoals[key] = defaults[key] || 0;
          }
        });
        
        // Add macro goals to the fallback assessment
        fallbackAssessment += `**MACRO GOALS:**\n`;
        fallbackAssessment += `Protein: ${fallbackMacroGoals.protein} grams per day\n`;
        fallbackAssessment += `Carbs: ${fallbackMacroGoals.carbs} grams per day\n`;
        fallbackAssessment += `Fats: ${fallbackMacroGoals.fats} grams per day\n`;
        fallbackAssessment += `Calories: ${fallbackMacroGoals.calories} calories per day`;
        
        // Store the fallback macro goals in the user profile
        try {
          const filePath = path.join(PROFILES_DIR, `${userId}.json`);
          
          if (fs.existsSync(filePath)) {
            const userProfileRaw = fs.readFileSync(filePath, 'utf8');
            const userProfile = JSON.parse(userProfileRaw);
            
            // Update profile with fallback macro goals
            userProfile.macroGoals = fallbackMacroGoals;
            userProfile.updatedAt = new Date().toISOString();
            
            fs.writeFileSync(filePath, JSON.stringify(userProfile, null, 2));
            debug('User profile updated with fallback macro goals after token limit error');
          }
        } catch (profileError) {
          debug('Error updating user profile with fallback macro goals:', profileError.message);
        }
        
        // Return the fallback assessment with a note about API limits
        debug('Sending fallback assessment to client due to token limit issues');
        return res.json({
          assessment: fallbackAssessment + "\n\n[Note: This is a simplified assessment due to API token limits. For a more detailed assessment, try with a more powerful API key.]",
          macroGoals: fallbackMacroGoals
        });
      } else {
        errorMessage = openaiError.message;
      }
      
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
    
  } catch (error) {
    debug('Final error handler caught:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate fitness assessment',
      details: error.message 
    });
  }
});

// Route to get recipe analysis (Gordon Ramsay persona)
router.post('/recipe-analysis', async (req, res) => {
  debug('Received recipe analysis request');
  try {
    const { transcript, macroGoals } = req.body;
    
    if (!transcript) {
      debug('Missing transcript in request');
      return res.status(400).json({ error: 'Transcript is required for recipe analysis' });
    }
    
    debug('Transcript length:', transcript.length, 'characters');
    debug('Macro goals provided:', macroGoals);
    
    // Mock data if no OpenAI API key is available
    if (!hasApiKey || !openai) {
      debug('Using mock data for recipe analysis because OpenAI API key is not available or client initialization failed');
      
      // Create a mock analysis based on the transcript
      const words = transcript.split(' ');
      const wordCount = words.length;
      
      // Extract potential ingredients from the transcript (simplified approach)
      const commonIngredients = [
        'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 
        'egg', 'milk', 'cheese', 'butter', 'oil', 'olive oil',
        'rice', 'pasta', 'bread', 'flour', 'sugar', 'salt', 'pepper',
        'onion', 'garlic', 'tomato', 'potato', 'carrot', 'broccoli', 'spinach',
        'lettuce', 'bell pepper', 'mushroom', 'avocado'
      ];
      
      const foundIngredients = [];
      commonIngredients.forEach(ingredient => {
        if (transcript.toLowerCase().includes(ingredient)) {
          foundIngredients.push(ingredient);
        }
      });
      
      // Create a basic analysis
      let mockAnalysis = '';
      
      if (foundIngredients.length === 0) {
        mockAnalysis = `WHAT THE HELL? This transcript doesn't even contain any recognizable ingredients! How am I supposed to analyze a recipe that doesn't exist? You've given me ${wordCount} words of utter NONSENSE! Try again with an ACTUAL cooking video, not whatever this rubbish is!`;
      } else {
        mockAnalysis = `I've analyzed this recipe with ${foundIngredients.length} main ingredients, including ${foundIngredients.slice(0, 3).join(', ')}.

GROCERY LIST:
${foundIngredients.map(ingredient => `- ${ingredient}`).join('\n')}
- Salt and pepper to taste
- Various herbs and spices

COOKING INSTRUCTIONS:
1. Prepare all your ingredients. Chop the vegetables, measure your portions.
2. Start with cooking the protein if present (${foundIngredients.includes('chicken') ? 'chicken' : foundIngredients.includes('beef') ? 'beef' : foundIngredients.includes('fish') ? 'fish' : 'protein'}).
3. Add the aromatics like ${foundIngredients.includes('onion') ? 'onion' : 'aromatics'} and ${foundIngredients.includes('garlic') ? 'garlic' : 'spices'}.
4. Incorporate remaining ingredients and cook until done.
5. Serve hot and enjoy your meal.

MEAL PREP INSTRUCTIONS:
To make 5 portions, simply multiply the ingredients by 5 and divide into containers after cooking. Store in the refrigerator for up to 4 days.

NOW FOR MY ANALYSIS:

This recipe is ${Math.random() > 0.5 ? 'DECENT' : 'ABSOLUTE RUBBISH'}! ${Math.random() > 0.5 ? 'The flavors have potential, but the execution is all wrong!' : 'Who taught you to cook like this? A blindfolded donkey?'}

Looking at your macro goals, this recipe ${Math.random() > 0.5 ? 'is WAY too high in carbs and fats' : 'lacks sufficient protein'}. You need to:

1. ${Math.random() > 0.5 ? 'DOUBLE the protein immediately' : 'Cut back on those ridiculous portions of carbs'}
2. ${Math.random() > 0.5 ? 'Add more vegetables, for God\'s sake!' : 'Use less oil, it\'s drowning in fat!'}
3. ${Math.random() > 0.5 ? 'Consider using leaner cuts of meat' : 'Add some bloody flavor with herbs and spices, not just salt!'}

Fix these issues and you might actually have something edible that aligns with your fitness goals. Now GET COOKING!`;
      }
      
      debug('Sending mock recipe analysis response');
      return res.json({
        analysis: mockAnalysis
      });
    }
    
    // If we have an API key, proceed with the actual OpenAI call
    debug('Preparing OpenAI request for recipe analysis');
    
    // Check transcript length and truncate if needed
    const maxChars = 8000; // Further reduced from 10000 to 8000 to ensure we stay well under token limits
    let truncatedTranscript = transcript;
    let truncationNote = '';
    
    if (transcript.length > maxChars) {
      debug(`Transcript too long (${transcript.length} chars). Truncating to ${maxChars} chars.`);
      truncatedTranscript = transcript.substring(0, maxChars);
      truncationNote = `[Note: Transcript was truncated from ${transcript.length} to ${maxChars} characters due to length constraints.]`;
    }
    
    // Define our retry strategy
    const attemptAnalysis = async (transcriptText, maxTokens, isRetry = false) => {
      debug(`${isRetry ? 'RETRY attempt' : 'First attempt'} - Sending request to OpenAI with model: gpt-3.5-turbo`);
      debug(`Using max_tokens: ${maxTokens}, transcript length: ${transcriptText.length} chars`);
      
      const messages = [
        {
          role: "system",
          content: isRetry ? 
            "You are Gordon Ramsay. Be brief but helpful. Focus on extracting the recipe and essential feedback only." :
            "You are Gordon Ramsay, the famous chef known for your brutally honest feedback, passion for food, and occasional use of mild profanity."
        },
        {
          role: "user",
          content: isRetry ?
            `Extract a recipe from this transcript and give brief cooking advice:\n${transcriptText}` :
            `Below is a transcript from a cooking video:
            ${transcriptText}
            ${truncationNote}
          
          The user has the following daily macro goals:
          ${macroGoals}
          
          First, extract a clear, detailed recipe from this transcript, including:
          1. A complete grocery list
          2. Step-by-step cooking instructions
          3. How to make 5 meal-prep portions of this dish
          
          Then, in your signature Gordon Ramsay style (passionate, occasionally using mild profanity, and brutally honest), 
          provide feedback on this recipe. Focus on:
          - How healthy/unhealthy this recipe is
          - How it could be modified to better meet the user's macro goals
          - 2-3 specific improvements to make it more nutritious and delicious
          
          Keep your feedback entertaining but genuinely helpful.`
        }
      ];
      
      return await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      });
    };
    
    try {
      // First attempt with regular parameters
      const response = await attemptAnalysis(truncatedTranscript, 3000);
      
      debug('Received response from OpenAI');
      
      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        debug('Invalid response structure from OpenAI:', response);
        throw new Error('Received invalid response structure from OpenAI');
      }
      
      const analysis = response.choices[0].message.content.trim();
      debug('Response content length: ' + analysis.length + ' characters');
      
      debug('Sending successful recipe analysis response');
      res.json({ 
        analysis: analysis
      });
      
    } catch (openaiError) {
      debug('Error in OpenAI API call for recipe analysis:', openaiError);
      debug('Error details:', openaiError.message);
      
      if (openaiError.response) {
        debug('OpenAI API response status:', openaiError.response.status);
        debug('OpenAI API response headers:', openaiError.response.headers);
        debug('OpenAI API response data:', openaiError.response.data);
      }
      
      // Handle common OpenAI errors with more specific messages
      let errorMessage = 'Unknown error with OpenAI API';
      
      if (openaiError.message.includes('model')) {
        errorMessage = 'Model gpt-3.5-turbo is not available for your account. Try updating to a different model.';
      } else if (openaiError.message.includes('rate limit')) {
        errorMessage = 'OpenAI rate limit exceeded. Please try again in a few minutes.';
      } else if (openaiError.message.includes('timeout')) {
        errorMessage = 'OpenAI request timed out. The service might be experiencing high traffic.';
      } else if (openaiError.message.includes('billing')) {
        errorMessage = 'OpenAI billing issue. Please check your account balance.';
      } else if (openaiError.message.includes('maximum context length') || openaiError.message.includes('token limit')) {
        // Special handling for token limit errors - retry with even smaller input
        debug('Token limit exceeded - trying with much smaller transcript');
        
        // Truncate to an even smaller size - 4000 characters
        const veryShortTranscript = truncatedTranscript.substring(0, 4000);
        
        try {
          // Retry with simplified prompt and smaller transcript
          debug('RETRY ATTEMPT with simplified prompt and smaller transcript');
          const smallerResponse = await attemptAnalysis(veryShortTranscript, 2000, true);
          
          if (smallerResponse && smallerResponse.choices && smallerResponse.choices[0]) {
            const smallerAnalysis = smallerResponse.choices[0].message.content.trim();
            
            // Return the smaller analysis with a note
            debug('Successfully generated smaller analysis after token limit error');
            return res.json({
              analysis: smallerAnalysis + "\n\n[Note: This is a simplified analysis due to the transcript length. For a more detailed analysis, try with a shorter video.]",
              usedFallback: true
            });
          }
        } catch (retryError) {
          debug('Failed retry with smaller transcript:', retryError.message);
          
          // Try an absolute minimum approach - just 2000 chars
          try {
            const tinyTranscript = truncatedTranscript.substring(0, 2000);
            debug('FINAL RETRY ATTEMPT with tiny transcript (2000 chars)');
            
            const tinyResponse = await attemptAnalysis(tinyTranscript, 1500, true);
            
            if (tinyResponse && tinyResponse.choices && tinyResponse.choices[0]) {
              const tinyAnalysis = tinyResponse.choices[0].message.content.trim();
              
              debug('Successfully generated tiny analysis after multiple token limit errors');
              return res.json({
                analysis: tinyAnalysis + "\n\n[Note: This is an extremely simplified analysis due to API limitations with this transcript length. For better results, try with a much shorter video (2-3 minutes).]",
                usedFallback: true,
                severelyLimited: true
              });
            }
          } catch (finalError) {
            debug('All retry attempts failed. Returning mock data as last resort');
            // If all else fails, use mock data
            return res.json({
              analysis: "I've tried to analyze this recipe, but the transcript is simply too long for processing with the current API limitations. Here are some general cooking tips instead:\n\n1. Always season properly. Salt and pepper are your basic essentials.\n2. Don't overcrowd the pan - cook in batches if needed.\n3. Let meat rest before cutting.\n4. Balance your macros with lean proteins, complex carbs, and healthy fats.\n\nTry again with a much shorter video (2-3 minutes) for a proper analysis.",
              usedFallback: true,
              apiFailure: true
            });
          }
        }
      } else {
        errorMessage = openaiError.message;
      }
      
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
    
  } catch (error) {
    debug('Final error handler caught in recipe analysis:', error.message);
    res.status(500).json({ error: 'Failed to generate recipe analysis', details: error.message });
  }
});

// Route to transcribe audio with Whisper API
router.post('/transcribe', async (req, res) => {
  debug('Received transcription request');
  try {
    const { videoUrl, socketId } = req.body;
    const io = req.app.get('io');
    
    if (!videoUrl) {
      debug('Missing videoUrl in request');
      if (socketId) {
        io.to(socketId).emit('transcriptionProgress', {
          stage: 'error',
          progress: 0,
          message: 'Video URL is required for transcription'
        });
      }
      return res.status(400).json({ error: 'Video URL is required for transcription' });
    }
    
    // Send initial progress update
    if (socketId) {
      io.to(socketId).emit('transcriptionProgress', {
        stage: 'initialized',
        progress: 0,
        message: 'Starting transcription process...'
      });
    }
    
    // Find the extracted audio file based on the video URL
    // The file should be in the temp directory with a pattern that includes timestamp
    const tempDir = path.join(__dirname, '../temp');
    const files = fs.readdirSync(tempDir);
    
    // Sort files by creation time (newest first) to get the most recent extraction
    const audioFiles = files
      .filter(file => file.startsWith('audio_') && file.endsWith('.mp3'))
      .map(file => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        return { file, path: filePath, time: stats.mtime.getTime() };
      })
      .sort((a, b) => b.time - a.time);
    
    if (audioFiles.length === 0) {
      debug('No audio files found in temp directory');
      if (socketId) {
        io.to(socketId).emit('transcriptionProgress', {
          stage: 'error',
          progress: 0,
          message: 'No extracted audio files found. Please extract audio first.'
        });
      }
      return res.status(400).json({ error: 'No extracted audio files found. Please extract audio first.' });
    }
    
    // Use the most recent audio file
    const audioFilePath = audioFiles[0].path;
    debug('Using most recent audio file:', audioFilePath);
    
    // Update progress - found audio file
    if (socketId) {
      io.to(socketId).emit('transcriptionProgress', {
        stage: 'processing',
        progress: 20,
        message: 'Audio file found, starting transcription...'
      });
    }
    
    const fileStats = fs.statSync(audioFilePath);
    debug('Audio file size:', Math.round(fileStats.size / 1024 / 1024 * 100) / 100, 'MB');
    
    // Mock data if no OpenAI API key is available
    if (!hasApiKey || !openai) {
      debug('Using mock transcription because OpenAI API key is not available or client initialization failed');
      
      // Create a mock transcript based on video cooking terms
      const mockTranscript = `Hello everyone, welcome to my cooking channel. Today I'm going to show you how to make a delicious and healthy meal that's perfect for meal prep.

We'll start with some chicken breast, about 500 grams. Season it with salt, pepper, garlic powder, and paprika. Heat a tablespoon of olive oil in a pan over medium-high heat.

While the pan is heating, let's chop one onion, two cloves of garlic, and some bell peppers - one red and one yellow for color. Also prepare some broccoli florets and slice two medium carrots.

Once the pan is hot, add the chicken and cook for about 5-6 minutes on each side until golden brown and cooked through. Remove the chicken and set aside.

In the same pan, add the onions and garlic. Sauté for about 2 minutes until fragrant. Then add the bell peppers, carrots, and broccoli. Cook for another 5 minutes until vegetables start to soften but still have some crunch.

Now, slice the chicken into strips and add it back to the pan with the vegetables. Add a splash of soy sauce, a tablespoon of honey, and a teaspoon of sriracha for some heat. Stir everything together.

For serving, prepare some brown rice or quinoa. This recipe makes about 4-5 portions, perfect for your weekly meal prep. Each portion has approximately 30 grams of protein, 45 grams of carbs, and 12 grams of fat.

Store in airtight containers in the refrigerator for up to 4 days. Enjoy your healthy, delicious meal!`;
      
      // Simulate progress updates
      if (socketId) {
        // Simulate processing stages
        setTimeout(() => {
          io.to(socketId).emit('transcriptionProgress', {
            stage: 'processing',
            progress: 50,
            message: 'Processing audio...'
          });
        }, 1000);
        
        setTimeout(() => {
          io.to(socketId).emit('transcriptionProgress', {
            stage: 'finalizing',
            progress: 80,
            message: 'Finalizing transcription...'
          });
        }, 2000);
        
        setTimeout(() => {
          io.to(socketId).emit('transcriptionProgress', {
            stage: 'completed',
            progress: 100,
            message: 'Transcription complete!'
          });
        }, 3000);
      }
      
      debug('Sending mock transcription response');
      return res.json({ transcript: mockTranscript });
    }
    
    // If we have an API key, proceed with the actual OpenAI call
    debug('Creating readable stream from audio file');
    const audioFile = fs.createReadStream(audioFilePath);
    
    // Update progress - sending to OpenAI
    if (socketId) {
      io.to(socketId).emit('transcriptionProgress', {
        stage: 'processing',
        progress: 40,
        message: 'Sending audio to OpenAI for transcription...'
      });
    }
    
    try {
      debug('Sending request to OpenAI Whisper API');
      // Call OpenAI's Whisper API to transcribe the audio
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });
      
      debug('Received response from Whisper API');
      
      if (!response || !response.text) {
        debug('Invalid response from Whisper API:', response);
        if (socketId) {
          io.to(socketId).emit('transcriptionProgress', {
            stage: 'error',
            progress: 0,
            message: 'Received invalid response from Whisper API'
          });
        }
        throw new Error('Received invalid response from Whisper API');
      }
      
      // Update progress - transcription complete
      if (socketId) {
        io.to(socketId).emit('transcriptionProgress', {
          stage: 'completed',
          progress: 100,
          message: 'Transcription complete!'
        });
      }
      
      debug('Transcription length:', response.text.length, 'characters');
      debug('Sending successful transcription response');
      res.json({ transcript: response.text });
      
    } catch (openaiError) {
      debug('Error in Whisper API call:', openaiError);
      debug('Error details:', openaiError.message);
      
      if (openaiError.response) {
        debug('Whisper API response status:', openaiError.response.status);
        debug('Whisper API response data:', openaiError.response.data);
      }
      
      // Handle common Whisper errors with more specific messages
      let errorMessage = 'Unknown error with Whisper API';
      
      if (openaiError.message.includes('file format')) {
        errorMessage = 'Invalid audio file format. Whisper supports MP3, MP4, MPEG, MPGA, M4A, WAV, and WEBM formats.';
      } else if (openaiError.message.includes('file size')) {
        errorMessage = 'Audio file is too large. Maximum size is 25MB.';
      } else if (openaiError.message.includes('rate limit')) {
        errorMessage = 'Whisper API rate limit exceeded. Please try again in a few minutes.';
      } else {
        errorMessage = openaiError.message;
      }
      
      if (socketId) {
        io.to(socketId).emit('transcriptionProgress', {
          stage: 'error',
          progress: 0,
          message: `Error: ${errorMessage}`
        });
      }
      
      throw new Error(`Whisper API error: ${errorMessage}`);
    }
    
  } catch (error) {
    debug('Final error handler caught in transcription:', error.message);
    res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
  }
});

module.exports = router;