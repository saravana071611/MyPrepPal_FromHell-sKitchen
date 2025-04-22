/**
 * Test script for YouTube audio extraction
 * This will help diagnose issues with the extraction process
 */

const path = require('path');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
console.log('FFMPEG Path:', ffmpegInstaller.path);

// Configuration
const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // A reliable test video
const outputDir = path.join(__dirname, 'temp');
const outputFilePath = path.join(outputDir, `test_audio_${Date.now()}.mp3`);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  console.log('Creating output directory:', outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
} else {
  console.log('Output directory already exists');
}

// Test file permissions
try {
  const testFilePath = path.join(outputDir, 'test-write.txt');
  fs.writeFileSync(testFilePath, 'Test write permission');
  fs.unlinkSync(testFilePath);
  console.log('File permissions test: SUCCESS');
} catch (err) {
  console.error('File permissions test: FAILED', err);
}

// Function to extract audio
async function extractAudio() {
  try {
    console.log('Starting extraction process for:', testVideoUrl);
    
    // Step 1: Get video info (basic test)
    try {
      console.log('Fetching video info...');
      const videoInfo = await ytdl.getInfo(testVideoUrl);
      console.log('Video info success! Title:', videoInfo.videoDetails.title);
    } catch (infoError) {
      console.error('Error fetching video info:', infoError.message);
      throw infoError;
    }
    
    // Step 2: Test basic ytdl stream
    try {
      console.log('Testing ytdl stream creation...');
      const streamTest = ytdl(testVideoUrl, { quality: 'highestaudio' });
      streamTest.on('info', (info) => {
        console.log('Stream info received');
      });
      
      // Just read a small part to test the stream
      let dataReceived = false;
      streamTest.on('data', (chunk) => {
        if (!dataReceived) {
          console.log('Successfully received data from stream');
          dataReceived = true;
          streamTest.destroy(); // Close the test stream
        }
      });
      
      // Wait for stream test to complete
      await new Promise((resolve, reject) => {
        streamTest.on('end', () => {
          console.log('Stream test complete');
          resolve();
        });
        
        streamTest.on('error', (err) => {
          console.error('Stream test error:', err);
          reject(err);
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          streamTest.destroy();
          console.log('Stream test timed out, but continuing...');
          resolve();
        }, 10000);
      });
    } catch (streamError) {
      console.error('Error testing stream:', streamError);
      // Continue to next test despite error
    }
    
    // Step 3: Full extraction test
    console.log('Starting full extraction test to:', outputFilePath);
    
    try {
      // Create ytdl stream
      const stream = ytdl(testVideoUrl, { 
        quality: 'highestaudio',
        filter: 'audioonly' 
      });
      
      // Process with ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(stream)
          .audioBitrate(128)
          .save(outputFilePath)
          .on('progress', (progress) => {
            if (progress && progress.percent) {
              console.log(`Processing progress: ${Math.floor(progress.percent)}%`);
            }
          })
          .on('end', () => {
            console.log('Downloaded and converted audio successfully');
            resolve();
          })
          .on('error', (err) => {
            console.error('Error in ffmpeg process:', err);
            reject(err);
          });
      });
      
      // Check file exists and has content
      if (fs.existsSync(outputFilePath)) {
        const stats = fs.statSync(outputFilePath);
        console.log(`Output file size: ${Math.round(stats.size / 1024)} KB`);
        
        if (stats.size < 1024) {
          console.warn('Warning: Extracted file is very small, extraction may have been incomplete');
        } else {
          console.log('Extraction SUCCESSFUL!');
        }
      } else {
        console.error('Output file was not created');
      }
    } catch (extractionError) {
      console.error('Full extraction test failed:', extractionError);
      
      // Create a fallback file for testing
      console.log('Creating fallback test file');
      fs.writeFileSync(outputFilePath, 'Fallback audio file - extraction failed');
      console.log('Fallback file created at:', outputFilePath);
    }
  } catch (error) {
    console.error('TEST FAILED:', error);
  }
}

// Run the test
console.log('YOUTUBE EXTRACTION TEST STARTING');
extractAudio().then(() => {
  console.log('TEST COMPLETED');
}).catch(err => {
  console.error('TEST FAILED WITH UNCAUGHT ERROR:', err);
}); 