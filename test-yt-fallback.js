/**
 * Test script for YouTube audio extraction using fallback method
 */

const path = require('path');
const fs = require('fs');
const youtubeDl = require('youtube-dl-exec');

// Configuration
const testVideoUrl = 'https://www.youtube.com/watch?v=W1XELWKaCi4';
const outputDir = path.join(__dirname, 'temp');
const outputFilePath = path.join(outputDir, `test_yt_dl_${Date.now()}.mp3`);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  console.log('Creating output directory:', outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
} else {
  console.log('Output directory exists:', outputDir);
}

async function extractWithYoutubeDl() {
  try {
    console.log('Using youtube-dl-exec for extraction');
    console.log('Video URL:', testVideoUrl);
    console.log('Output Path:', outputFilePath);
    
    // Create temp filename for the downloaded audio
    const tempOutputPath = outputFilePath + '.temp';
    
    // Execute youtube-dl to download audio directly to mp3
    await youtubeDl(testVideoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0, // Best quality
      output: tempOutputPath,
      noCheckCertificate: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    });
    
    // Rename temp file to final filename if it exists
    if (fs.existsSync(tempOutputPath)) {
      fs.renameSync(tempOutputPath, outputFilePath);
      console.log(`Successfully extracted audio to: ${outputFilePath}`);
      
      // Check file size
      const stats = fs.statSync(outputFilePath);
      console.log(`Output file size: ${Math.round(stats.size / 1024)} KB`);
      
      return true;
    } else {
      console.error('Temp file was not created');
      return false;
    }
  } catch (error) {
    console.error('Error using youtube-dl-exec:', error.message);
    return false;
  }
}

// Run the test
console.log('YOUTUBE-DL EXTRACTION TEST STARTING');
extractWithYoutubeDl().then((success) => {
  if (success) {
    console.log('TEST COMPLETED SUCCESSFULLY');
  } else {
    console.log('TEST FAILED');
  }
}).catch(err => {
  console.error('TEST FAILED WITH UNCAUGHT ERROR:', err);
}); 