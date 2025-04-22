const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Directory to store user profiles
const PROFILES_DIR = path.join(__dirname, '../data/profiles');

// OpenAI Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Route to get AI fitness assessment (combined Rock and Ramsay personas)
router.post('/fitness-assessment', async (req, res) => {
  try {
    const { userId, age, gender, currentWeight, currentHeight, activityLevel, targetWeight } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required for fitness assessment' });
    }
    
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