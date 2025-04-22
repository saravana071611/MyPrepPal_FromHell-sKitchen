// Load environment variables from .env file if available
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not found, will use command line arguments or environment variables');
}

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Check for API key in command line arguments
const args = process.argv.slice(2);
let apiKey = process.env.OPENAI_API_KEY;

// If API key is provided as command line argument, use it
if (args.length > 0 && args[0].startsWith('sk-')) {
  apiKey = args[0];
  console.log('Using API key from command line argument');
}

// Main test function
async function testWhisperTranscription() {
  console.log('====================================================');
  console.log('Testing OpenAI Whisper Transcription');
  console.log('====================================================');
  
  // Check OpenAI API key
  if (!apiKey) {
    console.error('Error: OpenAI API key not found');
    console.log('Please provide your API key as a command line argument:');
    console.log('node test-whisper-transcription.js YOUR_API_KEY');
    return;
  }
  
  // Create OpenAI client
  const openai = new OpenAI({
    apiKey: apiKey,
  });
  
  // Check for audio files in temp directory
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    console.error('Error: Temp directory does not exist');
    return;
  }
  
  // List audio files in temp directory
  const audioFiles = fs.readdirSync(tempDir)
    .filter(file => file.endsWith('.mp3'))
    .map(file => ({
      name: file,
      path: path.join(tempDir, file),
      stats: fs.statSync(path.join(tempDir, file))
    }))
    .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs); // Sort by modification time (newest first)
  
  if (audioFiles.length === 0) {
    console.error('Error: No audio files found in temp directory');
    return;
  }
  
  // Use the most recent audio file
  const audioFile = audioFiles[0];
  console.log(`Using most recent audio file: ${audioFile.name}`);
  console.log(`File size: ${(audioFile.stats.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Last modified: ${audioFile.stats.mtime}`);
  
  // Create a unique output filename for the transcription
  const timestamp = new Date().getTime();
  const transcriptionFile = path.join(tempDir, `transcription_${timestamp}.json`);
  
  try {
    console.log('\nStarting transcription with Whisper API...');
    console.log('This may take a minute or two depending on audio length...');
    
    // Open file stream
    const audioStream = fs.createReadStream(audioFile.path);
    
    // Call Whisper API
    const startTime = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json'
    });
    
    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\nTranscription completed in ${durationSeconds} seconds!`);
    console.log(`Text length: ${transcription.text.length} characters`);
    
    // Preview the transcription
    const previewText = transcription.text.length > 500 
      ? transcription.text.substring(0, 500) + '...' 
      : transcription.text;
    
    console.log('\nTranscription Preview:');
    console.log('----------------------------------------------------');
    console.log(previewText);
    console.log('----------------------------------------------------');
    
    // Save transcription to file
    fs.writeFileSync(
      transcriptionFile, 
      JSON.stringify(transcription, null, 2)
    );
    
    console.log(`\nFull transcription saved to: ${transcriptionFile}`);
    
    // Create a simplified text-only version
    const textOnlyFile = path.join(tempDir, `transcription_text_${timestamp}.txt`);
    fs.writeFileSync(textOnlyFile, transcription.text);
    console.log(`Text-only transcription saved to: ${textOnlyFile}`);
    
    console.log('\n====================================================');
    console.log('Transcription test completed successfully');
    console.log('====================================================');
    
  } catch (error) {
    console.error('\nError during transcription:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error);
    }
    console.log('\n====================================================');
    console.log('Transcription test failed');
    console.log('====================================================');
  }
}

// Run the test
testWhisperTranscription(); 