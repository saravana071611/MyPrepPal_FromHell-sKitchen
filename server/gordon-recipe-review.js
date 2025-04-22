/**
 * Gordon Ramsay Recipe Review Script
 * 
 * This script:
 * 1. Reads a transcription file
 * 2. Sends it to OpenAI API with Gordon Ramsay persona
 * 3. Gets back improved recipe, health modifications, and meal prep instructions
 * 4. Outputs a grocery list and steps for 5 portions
 * 
 * Usage:
 * node gordon-recipe-review.js [transcription_file_path] [openai_api_key]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Parse command line arguments
const args = process.argv.slice(2);
const transcriptionFilePath = args[0];
const apiKey = args[1] || process.env.OPENAI_API_KEY;

// Ensure we have an API key
if (!apiKey) {
  console.error('ERROR: OpenAI API key is required. Provide it as a command line argument or set OPENAI_API_KEY in .env file.');
  process.exit(1);
}

// Ensure we have a transcription file
if (!transcriptionFilePath) {
  console.error('ERROR: Transcription file path is required as the first argument.');
  console.error('Usage: node gordon-recipe-review.js [transcription_file_path] [openai_api_key]');
  process.exit(1);
}

async function reviewRecipe() {
  console.log('=== Gordon Ramsay Recipe Review ===');
  console.log(`Transcription file: ${transcriptionFilePath}`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(transcriptionFilePath)) {
      throw new Error(`Transcription file not found: ${transcriptionFilePath}`);
    }
    
    // Read transcription file
    let transcriptionContent;
    if (transcriptionFilePath.endsWith('.json')) {
      const jsonData = JSON.parse(fs.readFileSync(transcriptionFilePath, 'utf8'));
      transcriptionContent = jsonData.text;
    } else {
      transcriptionContent = fs.readFileSync(transcriptionFilePath, 'utf8');
    }
    
    console.log(`\nTranscription length: ${transcriptionContent.length} characters`);
    console.log('Sending to Gordon Ramsay (OpenAI)...\n');
    
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: apiKey
    });
    
    // Prepare the prompt for Gordon Ramsay's review
    const prompt = `
    You are Gordon Ramsay, the famous chef known for your passionate, direct and sometimes cheeky cooking style.
    
    I'm going to give you a transcription of a cooking video recipe. I need you to:
    
    1. Review the recipe and improve it with your culinary expertise
    2. Make it healthier without sacrificing flavor
    3. Add your signature flair and boldness to the recipe
    4. Adapt it for meal prep (5 portions)
    5. Create a grocery list with exact quantities needed
    6. Provide detailed cooking steps with your typical passionate commentary
    
    Be cheeky, passionate, and use your characteristic expressions. Don't hold back!
    
    Here's the transcription:
    
    ${transcriptionContent}
    `;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are Gordon Ramsay, the passionate, direct, and sometimes cheeky celebrity chef. You're reviewing and improving a recipe transcript, making it healthier while maintaining flavor, adapting it for meal prep (5 portions), and providing a grocery list with detailed cooking instructions. Use Gordon's characteristic expressions and passionate style." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 2500
    });
    
    // Get Gordon's response
    const gordonResponse = response.choices[0].message.content;
    
    // Save the response to a file
    const timestamp = Date.now();
    const outputFilePath = path.join(
      path.dirname(transcriptionFilePath), 
      `gordon_review_${timestamp}.txt`
    );
    
    fs.writeFileSync(outputFilePath, gordonResponse, 'utf8');
    
    // Display the response
    console.log('=== GORDON RAMSAY\'S REVIEW ===\n');
    console.log(gordonResponse);
    console.log('\n===============================');
    console.log(`\nGordon's review saved to: ${outputFilePath}`);
    
  } catch (error) {
    console.error('\n=== Error! ===');
    console.error(`${error.message}`);
    console.error(error.stack);
  }
}

// Run the recipe review
reviewRecipe().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 