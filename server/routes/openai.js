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
      
      // The Rock's part
      mockAssessment += `THE ROCK:\n`;
      mockAssessment += `Hey there, I see you're on a fitness journey! Your BMI is currently ${bmi}, and you're looking to ${isWeightLoss ? 'lose' : 'gain'} about ${Math.abs(weightDiff)}kg. That's a great goal, and I KNOW you can do this!\n\n`;
      mockAssessment += `Based on your stats - ${age} years old, ${gender}, ${currentHeight}cm tall, current weight of ${currentWeight}kg with a ${activityLevel} activity level - I've got the perfect macro breakdown for you.\n\n`;
      mockAssessment += `Your protein needs to be high to maintain muscle while ${isWeightLoss ? 'losing fat' : 'gaining mass'}. Carbs will fuel your workouts, and healthy fats will support your hormones and recovery. Trust me, stick to these macros and you'll see AMAZING results!\n\n`;
      
      // Gordon Ramsay's part
      mockAssessment += `GORDON RAMSAY:\n`;
      mockAssessment += `Right, listen to me carefully. Your current diet is probably ABSOLUTE RUBBISH based on these numbers. ${bmi > 25 ? "You're clearly eating too much processed junk!" : bmi < 18.5 ? "You're not eating enough quality food!" : "You need to focus on quality, not just quantity!"}\n\n`;
      mockAssessment += `Here's what you need to do: Cut the bloody processed foods, they're KILLING your progress! Focus on lean proteins - chicken breast, fish, and eggs. FRESH vegetables with every meal. Complex carbs like sweet potatoes and brown rice. And for God's sake, drink more water!\n\n`;
      mockAssessment += `A simple meal plan: Breakfast - egg white omelet with spinach and avocado. Lunch - grilled chicken with roasted vegetables. Dinner - baked salmon with quinoa and steamed broccoli. Snacks - Greek yogurt with berries or a handful of nuts. DONE. SIMPLE. EFFECTIVE. NOW GET COOKING!\n\n`;
      
      // Mock macro goals
      const mockMacroGoals = {
        protein: Math.round(currentWeight * (isWeightLoss ? 2.2 : 1.8)),
        carbs: Math.round(currentWeight * (isWeightLoss ? 2 : 3)),
        fats: Math.round(currentWeight * (isWeightLoss ? 0.8 : 1)),
        calories: Math.round(currentWeight * (isWeightLoss ? 22 : 28))
      };
      
      // Add macro goals to the assessment
      mockAssessment += `MACRO_GOALS:\n`;
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
      "As The Rock, you provide motivational fitness advice. " + 
      "As Gordon Ramsay, you provide brutally honest dietary feedback with mild profanity. " +
      "Always include specific macro goals (protein, carbs, fats) in your response and structure them clearly.";
      
    const userContent = `A user with the following profile has requested a fitness assessment:
    - Age: ${age}
    - Gender: ${gender}
    - Current Weight: ${currentWeight}kg
    - Current Height: ${currentHeight}cm
    - Activity Level: ${activityLevel}
    - Target Weight: ${targetWeight}kg
    
    First part (as The Rock): 
    - Provide a brief 2-3 line motivational assessment of their current status.
    - Calculate and recommend appropriate daily macronutrient goals (protein, carbs, fats) based on their profile.
    - Explain the rationale behind these recommendations using your fitness expertise and motivational tone.
    
    Second part (as Gordon Ramsay):
    - Give a brutally honest assessment of their current diet based on their stats.
    - Provide advice on what foods they should eat or avoid.
    - Suggest a simple meal plan that aligns with the macro goals.
    
    IMPORTANT: Always format the macro goals in this exact structure at the end of your response:
    MACRO_GOALS:
    Protein: X grams per day
    Carbs: Y grams per day
    Fats: Z grams per day
    Calories: W calories per day`;
    
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
      const macroSection = fullAssessment.split('MACRO_GOALS:');
      
      if (macroSection.length > 1) {
        const macroText = macroSection[1].trim();
        debug('Found macro goals section:', macroText);
        const macroLines = macroText.split('\n');
        
        macroLines.forEach(line => {
          if (line.includes('Protein:')) {
            macroGoals.protein = line.split('Protein:')[1].trim().split(' ')[0];
          } else if (line.includes('Carbs:')) {
            macroGoals.carbs = line.split('Carbs:')[1].trim().split(' ')[0];
          } else if (line.includes('Fats:')) {
            macroGoals.fats = line.split('Fats:')[1].trim().split(' ')[0];
          } else if (line.includes('Calories:')) {
            macroGoals.calories = line.split('Calories:')[1].trim().split(' ')[0];
          }
        });
        
        debug('Extracted macro goals:', macroGoals);
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
    const maxChars = 10000; // Reduced from 14000 to 10000 to leave more room for output tokens
    let truncatedTranscript = transcript;
    let truncationNote = '';
    
    if (transcript.length > maxChars) {
      debug(`Transcript too long (${transcript.length} chars). Truncating to ${maxChars} chars.`);
      truncatedTranscript = transcript.substring(0, maxChars);
      truncationNote = `[Note: Transcript was truncated from ${transcript.length} to ${maxChars} characters due to length constraints.]`;
    }
    
    try {
      debug('Sending request to OpenAI with model: gpt-3.5-turbo');
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Changed from gpt-4 to gpt-3.5-turbo
        messages: [
          {
            role: "system",
            content: "You are Gordon Ramsay, the famous chef known for your brutally honest feedback, passion for food, and occasional use of mild profanity."
          },
          {
            role: "user",
            content: `Below is a transcript from a cooking video:
            ${truncatedTranscript}
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
        ],
        max_tokens: 3000, // Increased from 1500 to 3000
        temperature: 0.7,
      });
      
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
      } else if (openaiError.message.includes('maximum context length')) {
        errorMessage = 'The transcript is too long for processing. Try with a shorter video.';
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
    const { audioFilePath } = req.body;
    
    if (!audioFilePath) {
      debug('Missing audioFilePath in request');
      return res.status(400).json({ error: 'Audio file path is required' });
    }
    
    if (!fs.existsSync(audioFilePath)) {
      debug('Audio file not found at path:', audioFilePath);
      return res.status(400).json({ error: 'Audio file not found at the specified path' });
    }
    
    debug('Audio file found at path:', audioFilePath);
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
      
      debug('Sending mock transcription response');
      return res.json({ transcript: mockTranscript });
    }
    
    // If we have an API key, proceed with the actual OpenAI call
    debug('Creating readable stream from audio file');
    const audioFile = fs.createReadStream(audioFilePath);
    
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
        throw new Error('Received invalid response from Whisper API');
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
      
      throw new Error(`Whisper API error: ${errorMessage}`);
    }
    
  } catch (error) {
    debug('Final error handler caught in transcription:', error.message);
    res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
  }
});

module.exports = router;