const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');

// OpenAI Configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Route to get AI fitness assessment (The Rock persona)
router.post('/fitness-assessment', async (req, res) => {
  try {
    const { age, gender, currentWeight, currentHeight, activityLevel, targetWeight } = req.body;
    
    const prompt = `You are Dwayne "The Rock" Johnson. 
    A user with the following profile has requested a fitness assessment:
    - Age: ${age}
    - Gender: ${gender}
    - Current Weight: ${currentWeight}kg
    - Current Height: ${currentHeight}cm
    - Activity Level: ${activityLevel}
    - Target Weight: ${targetWeight}kg
    
    First, provide a brief 2-3 line motivational assessment of their current status.
    Then, calculate and recommend appropriate daily macronutrient goals (protein, carbs, fats) based on their profile. 
    Explain the rationale behind these recommendations using your fitness expertise and motivational tone.`;

    const response = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      prompt: prompt,
      max_tokens: 350,
      temperature: 0.7,
    });

    res.json({ 
      assessment: response.data.choices[0].text.trim() 
    });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).json({ error: 'Failed to generate fitness assessment' });
  }
});

// Route to get recipe analysis (Gordon Ramsay persona)
router.post('/recipe-analysis', async (req, res) => {
  try {
    const { transcript, macroGoals } = req.body;
    
    const prompt = `You are Gordon Ramsay, the famous chef known for your brutally honest feedback.
    
    Below is a transcript from a cooking video:
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
    
    Keep your feedback entertaining but genuinely helpful.`;

    const response = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      prompt: prompt,
      max_tokens: 800,
      temperature: 0.7,
    });

    res.json({ 
      analysis: response.data.choices[0].text.trim() 
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
    const response = await openai.createTranscription(
      audioFile,
      "whisper-1"
    );
    
    res.json({ transcript: response.data.text });
  } catch (error) {
    console.error('Error with Whisper API:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

module.exports = router;