const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Directory to store user profiles
const PROFILES_DIR = path.join(__dirname, '../data/profiles');

// Check if OpenAI API key is available
const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;

// OpenAI Configuration - only create if API key exists
const openai = hasApiKey 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Route to get AI fitness assessment (combined Rock and Ramsay personas)
router.post('/fitness-assessment', async (req, res) => {
  try {
    const { userId, age, gender, currentWeight, currentHeight, activityLevel, targetWeight } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required for fitness assessment' });
    }
    
    // Mock data if no OpenAI API key is available
    if (!hasApiKey) {
      console.log('Using mock data because OpenAI API key is not available');
      
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
          console.log('User profile updated with mock macro goals');
        } else {
          console.error('User profile not found for storing macro goals');
        }
      } catch (error) {
        console.error('Error updating user profile with macro goals:', error);
      }
      
      return res.json({
        assessment: mockAssessment,
        macroGoals: mockMacroGoals
      });
    }
    
    // If we have an API key, proceed with the actual OpenAI call
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a fitness expert with two personas: Dwayne 'The Rock' Johnson and Gordon Ramsay. " +
            "As The Rock, you provide motivational fitness advice. " + 
            "As Gordon Ramsay, you provide brutally honest dietary feedback with mild profanity. " +
            "Always include specific macro goals (protein, carbs, fats) in your response and structure them clearly."
        },
        {
          role: "user",
          content: `A user with the following profile has requested a fitness assessment:
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
          Calories: W calories per day`
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const fullAssessment = response.choices[0].message.content.trim();
    
    // Extract the macro goals from the response
    let macroGoals = {};
    const macroSection = fullAssessment.split('MACRO_GOALS:');
    
    if (macroSection.length > 1) {
      const macroText = macroSection[1].trim();
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
        console.log('User profile updated with macro goals');
      } else {
        console.error('User profile not found for storing macro goals');
      }
    } catch (error) {
      console.error('Error updating user profile with macro goals:', error);
    }

    res.json({ 
      assessment: fullAssessment,
      macroGoals: macroGoals
    });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).json({ 
      error: 'Failed to generate fitness assessment',
      details: error.message 
    });
  }
});

// Route to get recipe analysis (Gordon Ramsay persona)
router.post('/recipe-analysis', async (req, res) => {
  try {
    const { transcript, macroGoals } = req.body;
    
    // Mock data if no OpenAI API key is available
    if (!hasApiKey) {
      console.log('Using mock data for recipe analysis because OpenAI API key is not available');
      
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
      
      return res.json({
        analysis: mockAnalysis
      });
    }
    
    // If we have an API key, proceed with the actual OpenAI call
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are Gordon Ramsay, the famous chef known for your brutally honest feedback, passion for food, and occasional use of mild profanity."
        },
        {
          role: "user",
          content: `Below is a transcript from a cooking video:
          ${transcript}
          
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
      max_tokens: 1000,
      temperature: 0.7,
    });

    res.json({ 
      analysis: response.choices[0].message.content.trim() 
    });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).json({ error: 'Failed to generate recipe analysis' });
  }
});

// Route to transcribe audio with Whisper API
router.post('/transcribe', async (req, res) => {
  try {
    const { audioFilePath } = req.body;
    
    if (!audioFilePath || !fs.existsSync(audioFilePath)) {
      return res.status(400).json({ error: 'Valid audio file path is required' });
    }
    
    // Mock data if no OpenAI API key is available
    if (!hasApiKey) {
      console.log('Using mock transcription because OpenAI API key is not available');
      
      // Create a mock transcript based on video cooking terms
      const mockTranscript = `Hello everyone, welcome to my cooking channel. Today I'm going to show you how to make a delicious and healthy meal that's perfect for meal prep.

We'll start with some chicken breast, about 500 grams. Season it with salt, pepper, garlic powder, and paprika. Heat a tablespoon of olive oil in a pan over medium-high heat.

While the pan is heating, let's chop one onion, two cloves of garlic, and some bell peppers - one red and one yellow for color. Also prepare some broccoli florets and slice two medium carrots.

Once the pan is hot, add the chicken and cook for about 5-6 minutes on each side until golden brown and cooked through. Remove the chicken and set aside.

In the same pan, add the onions and garlic. Sauté for about 2 minutes until fragrant. Then add the bell peppers, carrots, and broccoli. Cook for another 5 minutes until vegetables start to soften but still have some crunch.

Now, slice the chicken into strips and add it back to the pan with the vegetables. Add a splash of soy sauce, a tablespoon of honey, and a teaspoon of sriracha for some heat. Stir everything together.

For serving, prepare some brown rice or quinoa. This recipe makes about 4-5 portions, perfect for your weekly meal prep. Each portion has approximately 30 grams of protein, 45 grams of carbs, and 12 grams of fat.

Store in airtight containers in the refrigerator for up to 4 days. Enjoy your healthy, delicious meal!`;
      
      return res.json({ transcript: mockTranscript });
    }
    
    // Create a readable stream from the audio file
    const audioFile = fs.createReadStream(audioFilePath);
    
    // Call OpenAI's Whisper API to transcribe the audio
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });
    
    res.json({ transcript: response.text });
  } catch (error) {
    console.error('Error with Whisper API:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

module.exports = router;