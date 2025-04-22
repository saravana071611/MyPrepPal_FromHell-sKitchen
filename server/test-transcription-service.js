/**
 * Test script for TranscriptionService
 * 
 * This script demonstrates the complete flow:
 * 1. Extract audio from a YouTube video
 * 2. Transcribe it with Whisper API
 * 3. Save both audio and transcription to the temp directory
 * 
 * Usage:
 * node test-transcription-service.js [youtube_url] [openai_api_key]
 */

require('dotenv').config();
const TranscriptionService = require('./utils/transcription-service');

// Parse command line arguments
const args = process.argv.slice(2);
const videoUrl = args[0] || 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Default test video if none provided
const apiKey = args[1] || process.env.OPENAI_API_KEY;

// Ensure we have an API key
if (!apiKey) {
  console.error('ERROR: OpenAI API key is required. Provide it as a command line argument or set OPENAI_API_KEY in .env file.');
  process.exit(1);
}

async function runTest() {
  console.log('=== TranscriptionService Test ===');
  console.log(`Video URL: ${videoUrl}`);
  
  // Initialize service with debugging enabled
  const service = new TranscriptionService({
    apiKey,
    debug: true
  });
  
  // Track progress
  const progressCallback = (progress) => {
    console.log(`Progress: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
  };
  
  console.log('\nStarting extraction and transcription...');
  console.time('Total processing time');
  
  try {
    const result = await service.extractAndTranscribe(videoUrl, {
      progressCallback,
      verbose: true
    });
    
    console.timeEnd('Total processing time');
    
    if (result.success) {
      console.log('\n=== Success! ===');
      console.log(`Audio file: ${result.audioFile.path}`);
      console.log(`Audio size: ${(result.audioFile.size / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`Transcription JSON: ${result.transcription.jsonPath}`);
      console.log(`Transcription text: ${result.transcription.textPath}`);
      console.log('\nTranscription preview (first 300 chars):');
      console.log(result.transcription.text.substring(0, 300) + '...');
      
      // Keep files for inspection
      console.log('\nFiles will remain in the temp directory for inspection.');
    } else {
      console.error('\n=== Failed! ===');
      console.error(`Error: ${result.error}`);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }
  } catch (error) {
    console.timeEnd('Total processing time');
    console.error('\n=== Error! ===');
    console.error(`${error.message}`);
    console.error(error.stack);
  }
}

// Run the test
runTest().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1); 
}); 