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
      mockAssessment += `**GORDON RAMSAY:**\n\n`;
      mockAssessment += `WAKE UP, YOU ${isWeightLoss ? 'OVERWEIGHT' : 'UNDERWEIGHT'} DISASTER! At ${currentWeight}kg with a BMI of ${bmi}, you need to ${isWeightLoss ? 'LOSE' : 'GAIN'} ${Math.abs(weightDiff)}kg! Your current diet is ABSOLUTELY PATHETIC!\n\n`;
      mockAssessment += `Look at your EATING HABITS - they're a F***ING NIGHTMARE! Your metabolism is suffering from the GARBAGE you're putting in your body! At ${age} years old, you can't afford to keep poisoning yourself with processed RUBBISH!\n\n`;
      mockAssessment += `Your ${gender} body needs PROPER NUTRITION, not the cheap junk you've been shoving down your throat! With your height of ${currentHeight}cm, your food choices should be PRISTINE, not this DISASTER! You've been neglecting QUALITY INGREDIENTS and it SHOWS!\n\n`;
      mockAssessment += `I've seen better diets in PRISON CAFETERIAS! Every calorie of JUNK is pushing you further from your target weight of ${targetWeight}kg! This stops NOW or you'll never see results! Your ${activityLevel} activity level means NOTHING if your diet is TRASH!\n\n`;
      mockAssessment += `The state of your nutrition is so SHOCKING it would make a professional nutritionist CRY! You need immediate intervention before your arteries become as CLOGGED as a backed-up kitchen sink! The QUALITY of food you've been consuming is LOWER than the standards of a gas station convenience store!\n\n`;
      mockAssessment += `Your body is SCREAMING for nutrients while you're feeding it GARBAGE! You might as well be eating straight from the BIN! At your age and weight, this eating pattern is a F***ING HEALTH DISASTER waiting to happen!\n\n`;
      mockAssessment += `If I served what you eat in one of my restaurants, I'd be SHUT DOWN by health authorities! Your diet is an INSULT to proper nutrition and everything I stand for as a chef! It's time to COMPLETELY OVERHAUL your eating habits!\n\n`;
      
      mockAssessment += `FOOD COMMANDMENTS:\n\n`;
      mockAssessment += `1. CUT THE CRAP: No more processed foods - they're DESTROYING your ${age}-year-old body! With your ${activityLevel} activity level, this garbage is SABOTAGING you!\n\n`;
      mockAssessment += `2. PROTEIN IS YOUR SAVIOR: Lean meats, fish, eggs at EVERY meal. For someone ${currentHeight}cm tall, you need quality protein to maintain muscle while you ${isWeightLoss ? 'shed fat' : 'build mass'}!\n\n`;
      mockAssessment += `3. VEGETABLES ARE NON-NEGOTIABLE: Triple your vegetable intake NOW - green vegetables at EVERY meal or don't bother asking for my help again!\n\n`;
      
      mockAssessment += `MEAL PLAN:\n\n`;
      mockAssessment += `Breakfast: ${isWeightLoss ? "Egg white omelette with spinach and tomatoes" : "Whole eggs with avocado toast and smoked salmon"}\n\n`;
      mockAssessment += `Lunch: Grilled chicken breast, steamed broccoli, ${isWeightLoss ? "¼ cup brown rice" : "1 cup brown rice"}\n\n`;
      mockAssessment += `Dinner: Baked salmon, asparagus, ${isWeightLoss ? "small sweet potato" : "large sweet potato"}\n\n`;
      mockAssessment += `Snack: Greek yogurt with berries ${isWeightLoss ? "(MEASURE IT PRECISELY!)" : "and a handful of nuts"}\n\n`;
      
      mockAssessment += `NOW GET COOKING AND STOP WASTING MY TIME!\n\n`;
      
      // The Rock's part - Focus on exercise frequency and concrete steps
      mockAssessment += `**THE ROCK:**\n\n`;
      mockAssessment += `CAN YOU SMELLLLL WHAT THE ROCK IS COOKING? [raises eyebrow] Let me tell you something about TRAINING and TRANSFORMING that ${currentWeight}kg body!\n\n`;
      mockAssessment += `I've been in the fitness game for DECADES, pushing my body to the absolute limit. And I can tell you that with your ${activityLevel} activity level, we need to REVOLUTIONIZE your training program to hit that ${targetWeight}kg target!\n\n`;
      mockAssessment += `Your current workout routine is WEAK, jabroni! At ${currentHeight}cm tall, your body has UNTAPPED POTENTIAL for building lean muscle and boosting your metabolism! The right exercise protocol will completely transform your body composition!\n\n`;
      mockAssessment += `When I was transforming for roles like Black Adam and Hobbs, I learned that proper MACROS and TRAINING FREQUENCY are the keys to success. For someone your age (${age}), we need to focus on progressive overload and recovery cycles to optimize results!\n\n`;
      mockAssessment += `The INTENSITY of your current workouts wouldn't even make my warm-up routine! You need to train with PURPOSE and POWER to see real changes in your physique. My Team Rock trainers would have you DOUBLED OVER after the first 15 minutes!\n\n`;
      mockAssessment += `Your ${gender} body is capable of so much more than what you're currently demanding from it. I've trained thousands of people and seen incredible transformations when they commit to the process with everything they've got!\n\n`;
      mockAssessment += `With your frame and structure, you have the potential to build an IMPRESSIVE physique that will turn heads. But it takes DEDICATION and the RIGHT TRAINING APPROACH – no shortcuts, no excuses!\n\n`;
      mockAssessment += `I don't care what time you have to wake up – 4AM, 5AM – you MAKE THE TIME for your workouts! When I was shooting 14-hour days, I still hit the Iron Paradise at 2AM if that's what it took! That's the level of COMMITMENT you need!\n\n`;
      
      mockAssessment += `WEEKLY WORKOUT SCHEDULE:\n\n`;
      mockAssessment += `Monday - PUSH DAY: Chest/shoulders/triceps - 4×10 reps, 60sec rest\n\n`;
      mockAssessment += `Tuesday - CARDIO: 35min HIIT intervals (30sec work/30sec rest)\n\n`;
      mockAssessment += `Wednesday - PULL DAY: Back/biceps - 4×10 reps, 60sec rest\n\n`;
      mockAssessment += `Thursday - RECOVERY: 30min walk + 15min stretching\n\n`;
      mockAssessment += `Friday - LEG DAY: Squats/lunges/deadlifts - 4×10 reps, 75sec rest\n\n`;
      mockAssessment += `Saturday - CARDIO: 45min steady state + core work\n\n`;
      mockAssessment += `Sunday - REST DAY: Complete recovery (but meal prep for the week!)\n\n`;
      
      mockAssessment += `THE BOTTOM LINE: Given your ${activityLevel} lifestyle, you MUST train 5-6 days/week. Add weight or reps each week - PROGRESSIVE OVERLOAD! At ${currentHeight}cm tall with a goal weight of ${targetWeight}kg, consistency is your best friend. NO SHORTCUTS, NO EXCUSES - JUST RESULTS!\n\n`;
      
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
    const systemContent = "You are a fitness expert with two EXTREMELY authentic personas: Dwayne 'The Rock' Johnson and Gordon Ramsay. " +
      "Format their names in bold (e.g., **GORDON RAMSAY:**) at the beginning of their sections. " + 
      "Put Gordon Ramsay's section FIRST, followed by The Rock's section. " +
      "IMPORTANT - FORMATTING RULES: " +
      "1. Start each persona with a DETAILED INTRODUCTION of at least 10-12 lines that directly addresses the user's stats and needs. GORDON's intro should focus EXCLUSIVELY on DIET, FOOD QUALITY, and WEIGHT issues. THE ROCK's intro should focus EXCLUSIVELY on EXERCISE, TRAINING, and MACROS. Make these intros DISTINCTLY DIFFERENT in content and tone. " +
      "2. Format all section titles in ALL CAPS followed by a colon (e.g., 'MEAL PLAN:'). " +
      "3. Use CONSISTENT spacing - always put ONE blank line before and after each section title. " +
      "4. For bullet points, use the standard bullet symbol '•' (not circles or other symbols). " +
      "5. For EVERY bullet point: use ONE blank line before the bullet and ONE blank line after its content. " +
      "6. Sub-bullet points should be properly indented using the same bullet symbol '•' (not circles or other symbols). " +
      "7. Keep line lengths reasonable to prevent awkward wrapping in display. " +
      "8. Maintain consistent indentation throughout the entire output. " +
      "9. Apply the EXACT SAME formatting structure to both Gordon's and The Rock's sections. " +
      "As Gordon Ramsay, you are a FURIOUS, PASSIONATE, and FOUL-MOUTHED chef who is ENRAGED by poor dietary choices. Use his signature expletives (f***, s***, bloody, etc.), dramatic kitchen terminology, and over-the-top food descriptions. Be RUTHLESSLY honest, SCREAM in ALL CAPS frequently, and use funny food-related insults ('You absolute DONUT!'). Include at least one utterly outrageous comparison ('This diet is so bad it would make a garbage disposal regurgitate!'). " +
      "As The Rock, use his ACTUAL catchphrases ('CAN YOU SMELLLLL WHAT THE ROCK IS COOKING?', 'FOCUS. DISCIPLINE. CONSISTENCY.'), reference his own fitness journey, and be INTENSELY motivational but with occasional humor. Include his signature eyebrow raise '[raises eyebrow]' and use terms like 'jabroni' when describing poor workout habits. Be HYPER-SPECIFIC about workout routines down to the exact second of rest periods. " +
      "Both personas should be ENTERTAINING, MEMORABLE, and provide genuinely useful advice while staying completely in character. " +
      "CRITICAL: For both personas, clearly EXPLAIN WHY you're making each recommendation and directly REFERENCE THE USER'S SPECIFIC DATA (age, weight, height, activity level, goals) to show that your advice is HIGHLY PERSONALIZED. " +
      "Always include specific macro goals (protein, carbs, fats) in your response and structure them clearly. " +
      "Keep responses sharp, actionable and EXTREMELY personality-driven.";
      
    const userContent = `A user with the following profile has requested a fitness assessment:
    - Age: ${age}
    - Gender: ${gender}
    - Current Weight: ${currentWeight}kg
    - Current Height: ${currentHeight}cm
    - Activity Level: ${activityLevel}
    - Target Weight: ${targetWeight}kg
    
    First section (GORDON RAMSAY):
    - Start with "**GORDON RAMSAY:**" in bold
    - Begin with an EXTENDED INTRODUCTION (at least 10-12 lines) that passionately addresses their situation
    - This introduction should FOCUS EXCLUSIVELY on their DIET ISSUES, FOOD QUALITY, and WEIGHT PROBLEMS
    - Include specific mentions of how poor food choices are affecting their body at their specific age/weight/height
    - Focus EXCLUSIVELY on DIET and NUTRITION to help them reach their weight goal
    - Channel Gordon's EXPLOSIVE personality with UNCENSORED passion (using f***, etc.)
    - RAGE about their need to ${currentWeight > targetWeight ? 'LOSE' : 'GAIN'} ${Math.abs(currentWeight - targetWeight)}kg
    - Format all main categories in ALL CAPS followed by a colon (e.g., "MEAL PLAN:") with ONE blank line before and after
    - Use ONLY the standard bullet symbol "•" for ALL bullet points, with consistent spacing
    - EXPLAIN WHY each dietary recommendation is made specifically for this user's stats (BMI, age, activity level)
    - Provide THREE clear, actionable diet steps with specific foods to eat/avoid
    - Include colorful, chef-quality descriptions of food ("pan-seared to PERFECTION")
    - Include a SPECIFIC meal plan with breakfast, lunch, dinner and snack options
    - Add at least one SHOCKING food insult or comparison that would go viral on TV
    - Use actual Gordon phrases like "IT'S RAW!" and "WAKE UP!" for emphasis
    - Keep this section focused on FOOD and DIET only - do not mention exercise
    
    Second section (THE ROCK): 
    - Start with "**THE ROCK:**" in bold
    - Begin with an EXTENDED INTRODUCTION (at least 10-12 lines) that motivationally addresses their situation
    - This introduction should FOCUS EXCLUSIVELY on their TRAINING NEEDS, EXERCISE HABITS, and MACRO REQUIREMENTS
    - Include specific references to how proper training will transform their body at their specific age/weight/height
    - Focus EXCLUSIVELY on EXERCISE and TRAINING to help them reach their weight goal
    - Use The Rock's ACTUAL catchphrases and speaking style
    - Include at least one reference to his own training or "Team Rock" approach
    - Add "[raises eyebrow]" at least once for his signature expression
    - Format all main categories in ALL CAPS followed by a colon (e.g., "WORKOUT PLAN:") with ONE blank line before and after
    - Use ONLY the standard bullet symbol "•" for ALL bullet points, with consistent spacing
    - EXPLAIN WHY each workout is tailored specifically to this user's body type, age, and goals
    - Make direct references to the user's stats (weight, height, activity level) to show personalization
    - Provide a HYPER-SPECIFIC 7-day workout schedule with exact exercises, sets, reps and rest periods
    - Include intense but slightly humorous motivational lines
    - End with a powerful bottom-line message about training frequency and commitment
    - Keep this section focused on WORKOUTS and FITNESS only - do not discuss diet
    
    IMPORTANT: Always format the macro goals in this exact structure in a separate section:
    **MACRO GOALS:**
    Protein: X grams per day
    Carbs: Y grams per day
    Fats: Z grams per day
    Calories: W calories per day
    
    CRITICAL: Keep both sections authentic to their personalities, HIGHLY ENTERTAINING, and focused on their specific areas - Gordon on diet/nutrition and The Rock on workouts/training. Ensure the overall FORMATTING is IDENTICAL between sections for visual consistency.`;
    
    debug('Sending request to OpenAI with model: gpt-4o');
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
        max_tokens: 2000,
        temperature: 0.7,
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
        errorMessage = 'Model gpt-4o is not available for your account. Try updating to a different model.';
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
        fallbackAssessment += `**GORDON RAMSAY:**\n\n`;
        fallbackAssessment += `WAKE UP, YOU ${isWeightLoss ? 'OVERWEIGHT' : 'UNDERWEIGHT'} DISASTER! At ${currentWeight}kg with a BMI of ${bmi}, you need to ${isWeightLoss ? 'LOSE' : 'GAIN'} ${Math.abs(weightDiff)}kg! Your current diet is ABSOLUTELY PATHETIC!\n\n`;
        fallbackAssessment += `Look at your EATING HABITS - they're a F***ING NIGHTMARE! Your metabolism is suffering from the GARBAGE you're putting in your body! At ${age} years old, you can't afford to keep poisoning yourself with processed RUBBISH!\n\n`;
        fallbackAssessment += `Your ${gender} body needs PROPER NUTRITION, not the cheap junk you've been shoving down your throat! With your height of ${currentHeight}cm, your food choices should be PRISTINE, not this DISASTER! You've been neglecting QUALITY INGREDIENTS and it SHOWS!\n\n`;
        fallbackAssessment += `I've seen better diets in PRISON CAFETERIAS! Every calorie of JUNK is pushing you further from your target weight of ${targetWeight}kg! This stops NOW or you'll never see results! Your ${activityLevel} activity level means NOTHING if your diet is TRASH!\n\n`;
        
        fallbackAssessment += `FOOD COMMANDMENTS:\n\n`;
        
        fallbackAssessment += `• CUT OUT PROCESSED FOODS IMMEDIATELY! I want whole, fresh ingredients ONLY!
• PORTION CONTROL! Your plate should be colorful with vegetables taking up HALF the space!
• MEAL PREP! Stop the excuses about not having time to cook proper meals!
• HYDRATE PROPERLY! Water, not sugary drinks that are DESTROYING your metabolism!
• EAT LEAN PROTEINS with EVERY meal to build your muscle and recovery!

**THE ROCK:**

CAN YOU SMELLLLL WHAT THE ROCK IS COOKING? [raises eyebrow] Let me tell you something about TRAINING and TRANSFORMING that body!

I've been in the fitness game for DECADES, pushing my body to the absolute limit. And I can tell you that we need to REVOLUTIONIZE your training program to hit your target!

Your current workout routine is WEAK, jabroni! Your body has UNTAPPED POTENTIAL for building lean muscle and boosting your metabolism! The right exercise protocol will completely transform your body composition!

When I was transforming for roles like Black Adam and Hobbs, I learned that proper MACROS and TRAINING FREQUENCY are the keys to success. We need to focus on progressive overload and recovery cycles to optimize results!

The INTENSITY of your current workouts wouldn't even make my warm-up routine! You need to train with PURPOSE and POWER to see real changes in your physique. My Team Rock trainers would have you DOUBLED OVER after the first 15 minutes!

Your body is capable of so much more than what you're currently demanding from it. I've trained thousands of people and seen incredible transformations when they commit to the process with everything they've got!

With your frame and structure, you have the potential to build an IMPRESSIVE physique that will turn heads. But it takes DEDICATION and the RIGHT TRAINING APPROACH – no shortcuts, no excuses!

I don't care what time you have to wake up – 4AM, 5AM – you MAKE THE TIME for your workouts! When I was shooting 14-hour days, I still hit the Iron Paradise at 2AM if that's what it took!

That's the level of COMMITMENT you need! Are you ready to do the work? Because The Rock says your success depends on YOUR discipline and consistency!

WEEKLY WORKOUT SCHEDULE:

MONDAY: CHEST & TRICEPS - Heavy bench press, incline dumbbell press, chest flys, tricep dips
TUESDAY: BACK & BICEPS - Deadlifts, rows, pull-ups, hammer curls
WEDNESDAY: CARDIO & CORE - 30 min HIIT, abdominal circuit, planks, medicine ball work
THURSDAY: SHOULDERS & LEGS - Military press, squats, lunges, calf raises
FRIDAY: FULL BODY CIRCUIT - Compound movements, minimal rest periods
SATURDAY: ACTIVE RECOVERY - Light cardio, stretching, mobility work
SUNDAY: REST - But meal prep for the entire week! NO EXCUSES!

FINAL WORD:

**GORDON AND THE ROCK:**

Look, we're giving you the blueprint here! The rest is up to YOU. No excuses, no shortcuts! Follow our instructions EXACTLY, and you WILL see results. We've transformed countless bodies, and yours is next!

Track everything - your food, your workouts, your progress. Take weekly photos to document your journey. This isn't just about weight - it's about TRANSFORMING your entire lifestyle!

We'll be watching your progress - DON'T DISAPPOINT US! Now get to work and show us what you're made of! YOUR FITNESS JOURNEY STARTS RIGHT NOW!`;
        
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

IMPORTANT CULTURAL ACCURACY RULES:
1. If the title mentions or implies a specific regional cuisine (like Kashmiri, Southern Italian, Northern Thai), you MUST create an authentic recipe from that EXACT regional cuisine.
2. NEVER substitute cuisines - if the title suggests Kashmiri cuisine, do NOT create Mediterranean or generic Indian dishes.
3. Use ingredients, spices, cooking techniques and preparation methods that are authentic and traditional to the exact regional cuisine mentioned.
4. Each regional cuisine has unique characteristics - do not generalize or mix different culinary traditions.

Please create a recipe that:
1. Strongly reflects the cuisine, culture, cooking techniques, and preparation style suggested by the video title
2. Preserves the authentic flavors, spices, and cooking methods of the cuisine if a specific cuisine is mentioned or implied
3. Meets or is adjustable to meet the user's macro goals
4. Is suitable for meal prepping (can be cooked in batch and stored for 4-5 days)

Please organize the recipe in the following JSON format:
{
  "title": "Recipe title that reflects the cuisine and cooking style",
  "cuisine": "The cuisine or cultural origin of the dish (be very specific about regional cuisines)",
  "ingredients": ["ingredient 1 with quantities", "ingredient 2 with quantities", ...],
  "instructions": ["step 1", "step 2", ...],
  "notes": "Include: 1) How this recipe was inspired by the video title, 2) Why specific ingredients or techniques were chosen, 3) How the cuisine's cultural context influenced the recipe, 4) Meal prep instructions and storage recommendations",
  "nutritionInfo": "Estimated nutrition information per serving that aims to meet the user's macro goals"
}

Even if the title is vague or not clearly related to cooking, please create a nutritious meal prep recipe that would meet the user's fitness goals.
Be precise and include quantities and measurements for all ingredients.
If the title suggests a specific cuisine (Italian, Thai, Mexican, etc.) or preparation style (grilled, slow-cooked, etc.), make sure the recipe is authentic to that cuisine or style.
`;

        debug('Sending title-based prompt to OpenAI with model: gpt-4o');
        // Call OpenAI with the title-based prompt
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a professional chef that creates delicious meal prep recipes that meet specific macro goals. You have deep knowledge of global cuisines, cooking techniques, and cultural food traditions, and you strive to create authentic recipes that respect the culinary heritage they come from. CRITICAL INSTRUCTION: Always maintain strict regional accuracy - if a title mentions or implies Kashmiri cuisine, you MUST create an authentic Kashmiri recipe with proper Kashmiri ingredients and techniques, NOT Mediterranean, generic Indian, or any other cuisine. Never substitute regional cuisines. Each regional cuisine has unique characteristics that must be preserved. Provide detailed notes that explain how the recipe was inspired by the video title, why certain ingredients or techniques were chosen, and how cultural context influenced your recipe choices."
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
  "title": "Recipe title that reflects the cuisine and cooking style",
  "cuisine": "The cuisine or cultural origin of the dish (extracted from the transcript or inferred)",
  "ingredients": ["ingredient 1 with quantities", "ingredient 2 with quantities", ...],
  "instructions": ["step 1", "step 2", ...],
  "notes": "Include: 1) How this recipe was inspired by the video title/transcript, 2) Why specific ingredients or techniques were chosen based on the transcript, 3) How the cuisine's cultural context influenced the recipe, 4) Any meal prep instructions, storage recommendations, or chef's tips mentioned in the transcript",
  "nutritionInfo": "Any nutrition information mentioned or estimated based on ingredients"
}

If any section is not mentioned in the transcript, return an empty string or array for that section.
Be precise and include quantities and measurements when mentioned.
Pay special attention to any cultural references, traditional cooking techniques, or specific cuisine styles mentioned in the transcript.
Preserve the authentic flavors and methods of the cuisine as described in the video.
`;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional chef assistant that extracts recipes from cooking video transcripts. You have expertise in global cuisines and cultural cooking traditions, and you pay close attention to authentic ingredients, techniques, and flavor profiles specific to different culinary traditions. CRITICAL INSTRUCTION: Maintain strict regional accuracy - if the transcript mentions or refers to a specific regional cuisine (like Kashmiri, Northern Thai, etc.), ensure the recipe reflects that EXACT regional cuisine with authentic ingredients and techniques. Never generalize or substitute regional cuisines. In your notes, explain how the recipe was inspired by the content, why certain ingredients or techniques were chosen based on the transcript, and how cultural context influenced the recipe."
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