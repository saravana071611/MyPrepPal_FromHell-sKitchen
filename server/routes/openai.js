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
  debug('Request body:', req.body);
  
  try {
    const { transcript, videoUrl, userId } = req.body;
    
    // First, try to get the user's macro goals from their profile if userId is provided
    let userMacroGoals = null;
    if (userId) {
      try {
        const filePath = path.join(PROFILES_DIR, `${userId}.json`);
        debug('Looking for user profile at:', filePath);
        if (fs.existsSync(filePath)) {
          const userProfileRaw = fs.readFileSync(filePath, 'utf8');
          const userProfile = JSON.parse(userProfileRaw);
          if (userProfile.macroGoals) {
            userMacroGoals = userProfile.macroGoals;
            debug('Retrieved user macro goals from profile:', userMacroGoals);
          } else {
            debug('User profile exists but has no macro goals');
          }
        } else {
          debug('User profile does not exist:', filePath);
          // Generate default macro goals
          userMacroGoals = {
            protein: 150,
            carbs: 200,
            fats: 65,
            calories: 2000
          };
          debug('Using default macro goals:', userMacroGoals);
        }
      } catch (profileError) {
        debug('Error retrieving user macro goals:', profileError.message);
        // Create default macro goals
        userMacroGoals = {
          protein: 150,
          carbs: 200,
          fats: 65,
          calories: 2000
        };
        debug('Using default macro goals after error:', userMacroGoals);
      }
    } else {
      debug('No userId provided, using default macro goals');
      userMacroGoals = {
        protein: 150,
        carbs: 200,
        fats: 65,
        calories: 2000
      };
    }
    
    // Check if we have a transcript, if not and videoUrl is provided, we'll use the video title
    if (!transcript && !videoUrl) {
      debug('Missing both transcript and videoUrl in request');
      return res.status(400).json({ error: 'Either transcript or videoUrl is required for recipe analysis' });
    }
    
    // Check if we have API key
    if (!hasApiKey || !openai) {
      debug('Using mock recipe because OpenAI API key is not available');
      
      // Return mock recipe data for testing
      return res.json({
        recipe: {
          title: "Gordon Ramsay's Quick & Easy Chicken Stir Fry",
          ingredients: [
            "2 chicken breasts, sliced into strips",
            "2 cloves garlic, minced",
            "1 tablespoon fresh ginger, grated",
            "1 red bell pepper, sliced",
            "1 yellow bell pepper, sliced",
            "1 cup broccoli florets",
            "2 carrots, julienned",
            "3 tablespoons soy sauce",
            "1 tablespoon honey",
            "1 teaspoon sriracha sauce",
            "2 tablespoons olive oil",
            "Salt and pepper to taste",
            "Green onions for garnish"
          ],
          instructions: [
            "Season chicken strips with salt and pepper.",
            "Heat olive oil in a large pan or wok over medium-high heat.",
            "Add chicken and cook for 5-6 minutes until golden brown. Remove and set aside.",
            "In the same pan, add garlic and ginger. Sauté for 30 seconds until fragrant.",
            "Add bell peppers, broccoli, and carrots. Stir-fry for 3-4 minutes until vegetables begin to soften.",
            "Return chicken to the pan.",
            "Mix soy sauce, honey, and sriracha in a small bowl, then pour over the stir-fry.",
            "Toss everything together and cook for another 2 minutes until sauce thickens slightly.",
            "Garnish with green onions and serve hot over rice or noodles."
          ],
          notes: "This recipe is perfect for meal prep and can be stored in the refrigerator for up to 4 days.",
          nutritionInfo: "Per serving: approximately 320 calories, 32g protein, 15g carbohydrates, 14g fat"
        },
        source: 'mock_data'
      });
    }
    
    debug('Analyzing recipe with OpenAI');
    
    // If we have no transcript but have a videoUrl, try to get the video title
    if (!transcript && videoUrl) {
      debug('No transcript provided, attempting to generate recipe from video title');
      try {
        // Try to get video info to extract the title
        const ytdl = require('ytdl-core');
        let videoTitle = '';
        
        try {
          debug('Getting video info with ytdl-core:', videoUrl);
          const videoInfo = await ytdl.getInfo(videoUrl);
          videoTitle = videoInfo.videoDetails.title;
          debug('Retrieved video title:', videoTitle);
        } catch (ytdlError) {
          debug('Error getting video info with ytdl:', ytdlError.message);
          // First fallback: Extract video ID from URL and try to construct a cooking-related title
          const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
          if (videoId) {
            debug('Extracted video ID:', videoId);
            videoTitle = `Healthy Meal Prep Recipe (YouTube ID: ${videoId})`;
          } else {
            // Second fallback: If we can't even get the video ID, use a generic cooking title
            debug('Could not extract video ID, using generic title');
            videoTitle = 'Healthy Meal Prep Recipe';
          }
          debug('Using fallback video title:', videoTitle);
        }
        
        // Ensure we have a cooking-related title even if YouTube provided something unrelated
        if (!videoTitle.toLowerCase().includes('recipe') && 
            !videoTitle.toLowerCase().includes('cook') && 
            !videoTitle.toLowerCase().includes('meal') && 
            !videoTitle.toLowerCase().includes('food')) {
          // Append cooking context if the title doesn't seem food-related
          videoTitle += ' - Cooking Recipe';
          debug('Added cooking context to title:', videoTitle);
        }
        
        // Prepare the prompt for OpenAI using video title instead of transcript
        const macroGoalsText = userMacroGoals ? 
          `Protein: ${userMacroGoals.protein}g, Carbs: ${userMacroGoals.carbs}g, Fats: ${userMacroGoals.fats}g, Calories: ${userMacroGoals.calories}` :
          'A balanced diet suitable for general fitness';
        
        debug('Using macro goals for prompt:', macroGoalsText);
        
        const titlePrompt = `
You are a professional chef assistant specializing in recipe creation. Generate a complete meal prep recipe based on the following YouTube video title:

VIDEO TITLE:
${videoTitle}

USER'S MACRO GOALS:
${macroGoalsText}

Please create a recipe that:
1. Matches the theme/style suggested by the video title
2. Meets or is adjustable to meet the user's macro goals
3. Is suitable for meal prepping (can be cooked in batch and stored for 4-5 days)

Please organize the recipe in the following JSON format:
{
  "title": "Recipe title",
  "ingredients": ["ingredient 1 with quantities", "ingredient 2 with quantities", ...],
  "instructions": ["step 1", "step 2", ...],
  "notes": "Include meal prep instructions and storage recommendations",
  "nutritionInfo": "Estimated nutrition information per serving that aims to meet the user's macro goals"
}

Even if the title is vague or not clearly related to cooking, please create a nutritious meal prep recipe that would meet the user's fitness goals.
Be precise and include quantities and measurements for all ingredients.
`;

        debug('Sending title-based prompt to OpenAI with model: gpt-4o');
        // Call OpenAI with the title-based prompt
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a professional chef that creates delicious meal prep recipes that meet specific macro goals."
            },
            {
              role: "user",
              content: titlePrompt
            }
          ],
          temperature: 0.7, // Slightly higher temperature for creativity
          max_tokens: 1500,
          response_format: { type: "json_object" }
        });
        
        const content = response.choices[0]?.message?.content || '';
        
        debug('Received OpenAI title-based recipe response');
        debug('Response content length:', content.length);
        
        // Parse the JSON response
        try {
          const parsedRecipe = JSON.parse(content);
          debug('Successfully parsed recipe from title-based generation');
          return res.json({
            recipe: parsedRecipe,
            source: 'video_title' // Indicate this was generated from title, not transcript
          });
        } catch (parseError) {
          debug('Error parsing OpenAI title-based response as JSON', parseError);
          debug('Raw content that failed to parse:', content);
          return res.status(500).json({ 
            error: 'Failed to parse recipe information',
            details: parseError.message
          });
        }
      } catch (titleError) {
        debug('Error generating recipe from title:', titleError);
        debug('Error message:', titleError.message);
        debug('Error stack:', titleError.stack);
        return res.status(500).json({
          error: 'Failed to generate recipe from video title',
          details: titleError.message
        });
      }
    }
    
    // If we have a transcript, proceed with normal recipe extraction
    // Prepare the prompt for OpenAI
    const prompt = `
You are a professional chef assistant specializing in recipe extraction. Extract the complete recipe from the following transcript of a cooking video.

TRANSCRIPT:
${transcript}

USER'S MACRO GOALS:
${userMacroGoals ? 
  `Protein: ${userMacroGoals.protein}g, Carbs: ${userMacroGoals.carbs}g, Fats: ${userMacroGoals.fats}g, Calories: ${userMacroGoals.calories}` :
  'Not specified, assume a balanced diet'}

Please organize the recipe in the following JSON format:
{
  "title": "Recipe title",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "notes": "Any additional notes or tips mentioned",
  "nutritionInfo": "Any nutrition information mentioned or estimated based on ingredients"
}

If any section is not mentioned in the transcript, return an empty string or array for that section.
Be precise and include quantities and measurements when mentioned.
`;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional chef assistant that extracts recipes from cooking video transcripts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0]?.message?.content || '';
    
    debug('Received OpenAI response');
    
    // Parse the JSON response
    try {
      const parsedRecipe = JSON.parse(content);
      
      return res.json({
        recipe: parsedRecipe,
        source: 'transcript' // Indicate this was extracted from transcript
      });
    } catch (parseError) {
      debug('Error parsing OpenAI response as JSON', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse recipe information',
        details: parseError.message
      });
    }
    
  } catch (error) {
    debug('Error analyzing recipe:', error);
    return res.status(500).json({
      error: 'Failed to analyze recipe',
      details: error.message
    });
  }
});

// Route to transcribe audio with Whisper API
router.post('/transcribe', async (req, res) => {
  debug('Received transcription request');
  try {
    const { videoUrl, audioPath, audioFilePath: reqAudioFilePath, socketId } = req.body;
    const io = req.app.get('io');
    
    // Use the provided audio path, prioritizing audioPath over audioFilePath
    let providedAudioPath = audioPath || reqAudioFilePath;
    
    // If no audio path was provided but a videoUrl was, we'll try to find the audio file
    if (!providedAudioPath && !videoUrl) {
      debug('Missing audioPath/audioFilePath and videoUrl in request');
      if (socketId) {
        io.to(socketId).emit('transcriptionProgress', {
          stage: 'error',
          progress: 0,
          message: 'Audio path or video URL is required for transcription'
        });
      }
      return res.status(400).json({ error: 'Either audio path or video URL is required for transcription' });
    }
    
    // Send initial progress update
    if (socketId) {
      io.to(socketId).emit('transcriptionProgress', {
        stage: 'initialized',
        progress: 0,
        message: 'Starting transcription process...'
      });
    }
    
    // Set up the audio file path
    let audioFilePath;
    
    // If we have a provided audio path, use it directly
    if (providedAudioPath) {
      debug('Using provided audio path:', providedAudioPath);
      audioFilePath = providedAudioPath;
      
      // Check if the file actually exists
      if (!fs.existsSync(audioFilePath)) {
        debug('Provided audio file does not exist:', audioFilePath);
        if (socketId) {
          io.to(socketId).emit('transcriptionProgress', {
            stage: 'error',
            progress: 0,
            message: 'Provided audio file does not exist'
          });
        }
        return res.status(400).json({ error: 'Provided audio file does not exist' });
      }
    } else {
      // Otherwise, find the extracted audio file based on the video URL
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
      audioFilePath = audioFiles[0].path;
      debug('Using most recent audio file:', audioFilePath);
    }
    
    // Update progress - found audio file
    if (socketId) {
      io.to(socketId).emit('transcriptionProgress', {
        stage: 'processing',
        progress: 20,
        message: 'Audio file found, starting transcription...'
      });
    }
    
    // Ensure the file exists and get stats
    try {
      const fileStats = fs.statSync(audioFilePath);
      debug('Audio file size:', Math.round(fileStats.size / 1024 / 1024 * 100) / 100, 'MB');
    } catch (statError) {
      debug('Error accessing audio file:', statError.message);
      if (socketId) {
        io.to(socketId).emit('transcriptionProgress', {
          stage: 'error',
          progress: 0,
          message: `Error accessing audio file: ${statError.message}`
        });
      }
      return res.status(500).json({ error: 'Error accessing audio file', details: statError.message });
    }
    
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