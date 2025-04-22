/**
 * Test script for YouTube audio extraction
 * This will help diagnose issues with the extraction process
 */

const path = require('path');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const youtubeDl = require('youtube-dl-exec');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
console.log('FFMPEG Path:', ffmpegInstaller.path);

// Configuration
const testVideoUrl = 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Example video
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

// Fallback extraction function using youtube-dl-exec
async function extractAudioWithYoutubeDl(videoUrl, outputFilePath) {
  try {
    console.log('Using youtube-dl-exec for extraction');
    
    // Create temp filename for the downloaded audio
    const tempOutputPath = outputFilePath + '.temp';
    
    // Execute youtube-dl to download audio directly to mp3
    await youtubeDl(videoUrl, {
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
    
    // Rename temp file to final filename
    if (fs.existsSync(tempOutputPath)) {
      fs.renameSync(tempOutputPath, outputFilePath);
      console.log(`Successfully extracted audio using youtube-dl-exec to: ${outputFilePath}`);

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
      console.log('Will continue with youtube-dl-exec fallback later');
      // We don't throw here to continue with the fallback method
    }
    
    // Step 2: Test basic ytdl stream
    let ytdlStreamSuccess = false;
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
          ytdlStreamSuccess = true;
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
    
    // Step 3: If ytdl fails, try youtube-dl-exec as fallback
    if (!ytdlStreamSuccess) {
      console.log('ytdl-core extraction failed, trying fallback method...');
      const fallbackSuccess = await extractAudioWithYoutubeDl(testVideoUrl, outputFilePath);
      if (fallbackSuccess) {
        console.log('Fallback extraction successful!');
        return;
      } else {
        console.error('Both primary and fallback extraction methods failed');
        throw new Error('All extraction methods failed');
      }
    }
    
    // Step 4: Full extraction test with ytdl if stream test was successful
    if (ytdlStreamSuccess) {
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
          throw new Error('Output file was not created');
        }
      } catch (extractionError) {
        console.error('Full extraction test failed:', extractionError);
        
        // Try fallback if primary method fails
        console.log('Trying fallback extraction method...');
        const fallbackSuccess = await extractAudioWithYoutubeDl(testVideoUrl, outputFilePath);
        if (!fallbackSuccess) {
          throw new Error('All extraction methods failed');
        }
      }
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