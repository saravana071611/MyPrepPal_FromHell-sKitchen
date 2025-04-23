const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const axios = require('axios');
const youtubeDl = require('youtube-dl-exec');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Fallback extraction function using youtube-dl-exec
async function extractAudioWithYoutubeDl(videoUrl, outputFilePath) {
  try {
    console.log('Using youtube-dl-exec for extraction');
    console.log('Output file path:', outputFilePath);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      console.log('Creating output directory for youtube-dl-exec:', outputDir);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get just the filename without extension
    const fileBaseName = path.basename(outputFilePath, path.extname(outputFilePath));
    const outputDir2 = path.dirname(outputFilePath);
    const tempOutputPath = path.join(outputDir2, `${fileBaseName}_temp`);
    
    console.log('Using temporary output path:', tempOutputPath);
    
    // Execute youtube-dl to download audio directly to mp3
    try {
      const result = await youtubeDl(videoUrl, {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0, // Best quality
        output: tempOutputPath,
        noCheckCertificate: true,
        verbose: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ]
      });
      
      console.log('youtube-dl-exec completed successfully');
      console.log('Command output:', result);
    } catch (dlError) {
      console.error('Error with youtube-dl-exec:', dlError.message);
      
      // Try with direct yt-dlp command as a last resort
      console.log('Trying direct yt-dlp command as last resort...');
      await new Promise((resolve, reject) => {
        const args = [
          videoUrl,
          '--extract-audio',
          '--audio-format', 'mp3',
          '--audio-quality', '0',
          '-o', tempOutputPath,
          '--no-check-certificate'
        ];
        
        console.log(`Executing: yt-dlp ${args.join(' ')}`);
        const child = require('child_process').spawn('yt-dlp', args);
        
        child.stdout.on('data', (data) => {
          console.log(`yt-dlp output: ${data}`);
        });
        
        child.stderr.on('data', (data) => {
          console.error(`yt-dlp error: ${data}`);
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            console.log('Direct yt-dlp command completed successfully');
            resolve();
          } else {
            console.error(`Direct yt-dlp command failed with code ${code}`);
            reject(new Error(`yt-dlp exited with code ${code}`));
          }
        });
      });
    }
    
    // After download, check for the file - youtube-dl-exec adds .mp3 extension
    const expectedOutputPath = `${tempOutputPath}.mp3`;
    console.log('Checking for file at:', expectedOutputPath);
    
    if (fs.existsSync(expectedOutputPath)) {
      // File exists, copy to the requested output path
      fs.copyFileSync(expectedOutputPath, outputFilePath);
      console.log(`File copied from ${expectedOutputPath} to ${outputFilePath}`);
      
      // Check file size
      const stats = fs.statSync(outputFilePath);
      console.log(`Output file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
      
      // Clean up temp file
      try {
        fs.unlinkSync(expectedOutputPath);
        console.log('Temp file cleaned up');
      } catch (cleanupError) {
        console.log('Note: Could not clean up temp file:', cleanupError.message);
      }
      
      return true;
    } else {
      // If exact expected path not found, search for any mp3 file with similar name
      console.log('Expected output file not found, searching for alternative files...');
      
      const dirContents = fs.readdirSync(outputDir);
      console.log('Files in directory:', dirContents);
      
      // Look for mp3 files
      const mp3Files = dirContents.filter(file => 
        file.endsWith('.mp3') && file.includes(path.basename(tempOutputPath))
      );
      
      if (mp3Files.length > 0) {
        const foundFile = mp3Files[0];
        const foundPath = path.join(outputDir, foundFile);
        console.log(`Found alternative file: ${foundPath}`);
        
        // Copy to the requested output path
        fs.copyFileSync(foundPath, outputFilePath);
        console.log(`File copied from ${foundPath} to ${outputFilePath}`);
        
        return true;
      }
      
      throw new Error('No output audio file found after youtube-dl-exec extraction');
    }
  } catch (error) {
    console.error('Error using youtube-dl-exec:', error.message);
    throw error;
  }
}

// Helper function for youtube-dl-exec with better error handling
const safeYoutubeDl = async (url, options = {}) => {
  // Default options with custom settings for better compatibility
  const ytdlpOptions = {
    noCheckCertificate: true,
    preferFreeFormats: true,
    addHeader: [
      'referer:youtube.com',
      'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ],
    ...options
  };

  try {
    return await youtubeDl(url, ytdlpOptions);
  } catch (error) {
    console.error('youtube-dl-exec error:', error.message);
    throw error;
  }
};

// Helper function to extract video ID from various YouTube URL formats
function extractVideoId(url) {
  // Try manual extraction first
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i, // Standard YouTube URLs
    /youtube\.com\/shorts\/([^"&?\/\s]{11})/i, // YouTube Shorts URLs
    /youtube\.com\/watch\?v=([^"&?\/\s]{11})/i, // Direct watch URLs
    /youtu\.be\/([^"&?\/\s]{11})/i // Short URLs
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  throw new Error('Could not extract video ID from URL');
}

// Try another approach to get video duration and view count
async function getVideoExtraInfo(videoId) {
  try {
    // Try to fetch the metadata from YouTube's alternate watch endpoint
    const infoUrl = `https://www.youtube.com/get_video_info?video_id=${videoId}&hl=en`;
    console.log('Fetching additional video info from:', infoUrl);
    
    const response = await axios.get(infoUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      }
    });
    
    const data = response.data;
    let viewCount = 0;
    let lengthSeconds = 0;
    
    // Parse the response data
    if (data) {
      // Try to extract length from player_response
      const playerResponseMatch = data.match(/player_response=([^&]*)/);
      if (playerResponseMatch && playerResponseMatch[1]) {
        try {
          const decodedResponse = decodeURIComponent(playerResponseMatch[1]);
          const playerResponse = JSON.parse(decodedResponse);
          
          if (playerResponse.videoDetails) {
            lengthSeconds = parseInt(playerResponse.videoDetails.lengthSeconds) || 0;
            viewCount = parseInt(playerResponse.videoDetails.viewCount) || 0;
            
            console.log('Successfully extracted from get_video_info:', {
              duration: lengthSeconds,
              views: viewCount
            });
          }
        } catch (parseError) {
          console.log('Error parsing player_response:', parseError.message);
        }
      }
    }
    
    return { lengthSeconds, viewCount };
  } catch (error) {
    console.log('Extra info fetch failed:', error.message);
    return { lengthSeconds: 0, viewCount: 0 };
  }
}

// Fetch video info using Axios as a fallback to ytdl-core
async function fetchVideoInfoFallback(videoId) {
  try {
    console.log('Attempting fallback method to fetch video info for ID:', videoId);
    
    // First try using YouTube's oEmbed API (doesn't require API key)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    let videoInfo = null;
    let durationSeconds = 0;
    let viewCount = 0;
    
    // Try to get duration and view count from alternative sources
    try {
      // Method 1: Try the YouTube page scraping
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log('Attempting to fetch page data from:', watchUrl);
      const pageResponse = await axios.get(watchUrl, { 
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
        } 
      });
      
      const pageData = pageResponse.data;
      
      // Extract data using regex
      const viewCountMatch = pageData.match(/"viewCount":"([0-9]+)"/);
      if (viewCountMatch && viewCountMatch[1]) {
        viewCount = parseInt(viewCountMatch[1]);
        console.log('Extracted view count from page:', viewCount);
      }
      
      const durationMatch = pageData.match(/"lengthSeconds":"?([0-9]+)"?/);
      if (durationMatch && durationMatch[1]) {
        durationSeconds = parseInt(durationMatch[1]);
        console.log('Extracted duration from page:', durationSeconds);
      }
    } catch (pageError) {
      console.log('Could not extract data from YouTube page:', pageError.message);
      
      // Method 2: Try the video info approach
      try {
        const extraInfo = await getVideoExtraInfo(videoId);
        if (extraInfo.lengthSeconds > 0) {
          durationSeconds = extraInfo.lengthSeconds;
        }
        if (extraInfo.viewCount > 0) {
          viewCount = extraInfo.viewCount;
        }
      } catch (extraError) {
        console.log('Extra info fetch failed:', extraError.message);
      }
    }
    
    // Then get basic info from oEmbed API
    try {
      const oembedResponse = await axios.get(oembedUrl, { timeout: 8000 });
      console.log('Successfully fetched data from oEmbed API');
      
      // We got some basic info from oEmbed
      videoInfo = {
        videoDetails: {
          title: oembedResponse.data.title || 'Unknown Title',
          author: { name: oembedResponse.data.author_name || 'Unknown Author' },
          lengthSeconds: durationSeconds || 0,
          publishDate: new Date().toISOString().split('T')[0],
          viewCount: viewCount || 0,
          thumbnails: [{ url: oembedResponse.data.thumbnail_url || '' }],
          description: '',
          videoId: videoId
        }
      };
    } catch (oembedError) {
      console.error('oEmbed API failed:', oembedError.message);
      
      // If oEmbed fails, create a minimal response
      videoInfo = {
        videoDetails: {
          title: 'YouTube Video ' + videoId,
          author: { name: 'YouTube Creator' },
          lengthSeconds: durationSeconds || 0,
          publishDate: new Date().toISOString().split('T')[0],
          viewCount: viewCount || 0,
          thumbnails: [{ url: `https://img.youtube.com/vi/${videoId}/0.jpg` }],
          description: '',
          videoId: videoId
        }
      };
    }
    
    // Use YouTube's thumbnail API to at least get a thumbnail
    // This is public and doesn't require an API key
    if (!videoInfo.videoDetails.thumbnails[0].url) {
      videoInfo.videoDetails.thumbnails[0].url = `https://img.youtube.com/vi/${videoId}/0.jpg`;
    }
    
    console.log('Successfully created fallback video info object:', {
      title: videoInfo.videoDetails.title,
      duration: videoInfo.videoDetails.lengthSeconds,
      views: videoInfo.videoDetails.viewCount
    });
    
    return videoInfo;
  } catch (error) {
    console.error('All fallback methods failed:', error.message);
    throw new Error('Failed to fetch video information using all available methods');
  }
}

// Helper function to retry API calls with timeout
async function retryOperationWithTimeout(operation, timeoutMs = 30000, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);
      
      // Create a promise that will reject after the timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      );
      
      // Race the operation against the timeout
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      console.log(`Attempt ${attempt} failed: ${error.message}`);
      lastError = error;
      
      // If this was a timeout error and we've reached max retries, throw a more descriptive error
      if (attempt === maxRetries && error.message.includes('timed out')) {
        throw new Error(`YouTube API request timed out after ${maxRetries} attempts. This may indicate YouTube API rate limiting or server issues.`);
      }
      
      // Don't wait on the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff: wait longer between each retry
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}

// Route to extract audio from YouTube video
router.post('/extract-audio', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const io = req.app.get('io');
    const socketId = req.body.socketId;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
    console.log('Attempting to extract audio from:', videoUrl);
    
    // Emit initial progress update
    if (socketId) {
      io.to(socketId).emit('audioExtractionProgress', {
        stage: 'initialized',
        progress: 0,
        message: 'Starting audio extraction...'
      });
    }
    
    const outputDir = path.join(__dirname, '../temp');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      console.log('Creating output directory:', outputDir);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate a unique filename based on timestamp
    const timestamp = new Date().getTime();
    const outputFilePath = path.join(outputDir, `audio_${timestamp}.mp3`);
    
    // Emit progress update - getting video info
    if (socketId) {
      io.to(socketId).emit('audioExtractionProgress', {
        stage: 'info',
        progress: 10,
        message: 'Fetching video information...'
      });
    }
    
    // Get video info with error handling
    let videoInfo;
    try {
      console.log('Fetching video info...');
      try {
        videoInfo = await ytdl.getInfo(videoUrl);
        console.log('Successfully fetched video info for:', videoInfo.videoDetails.title);
      } catch (infoError) {
        // If standard method fails, try with different options
        console.log('Standard ytdl.getInfo failed, trying with custom options');
        const videoId = extractVideoId(videoUrl);
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        
        videoInfo = await ytdl.getInfo(url, {
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Referer': 'https://www.youtube.com/'
            }
          }
        });
        console.log('Successfully fetched video info with custom options');
      }
    } catch (infoError) {
      console.error('Error fetching video info:', infoError.message);
      
      // Try to continue with a mock title if video info fails
      videoInfo = { videoDetails: { title: `Unknown Video (${timestamp})`, lengthSeconds: 300 }};
      console.log('Using fallback video info');
      
      // Report error but continue
      if (socketId) {
        io.to(socketId).emit('audioExtractionProgress', {
          stage: 'warning',
          progress: 15,
          message: `Warning: Could not fetch video details. Continuing with extraction.`
        });
      }
    }
    
    const title = videoInfo.videoDetails.title;
    const videoLengthSeconds = parseInt(videoInfo.videoDetails.lengthSeconds) || 300;
    
    // Emit progress update - starting download
    if (socketId) {
      io.to(socketId).emit('audioExtractionProgress', {
        stage: 'download',
        progress: 20,
        message: 'Starting audio download...',
        title: title,
        lengthSeconds: videoLengthSeconds
      });
    }
    
    try {
      // Download audio using yt-dlp directly (reliable method)
      console.log('Starting audio download with yt-dlp...');
      
      await new Promise((resolve, reject) => {
        // Create command arguments
        const args = [
          videoUrl,
          '--extract-audio',
          '--audio-format', 'mp3',
          '--audio-quality', '0',
          '-o', outputFilePath,
          '--no-check-certificate'
        ];
        
        console.log(`Executing yt-dlp command: yt-dlp ${args.join(' ')}`);
        const child = require('child_process').spawn('yt-dlp', args);
        
        let progressPercent = 0;
        let lastProgressUpdate = 0;
        
        child.stdout.on('data', (data) => {
          const output = data.toString();
          console.log(`[yt-dlp] ${output.trim()}`);
          
          // Parse progress information
          if (output.includes('[download]')) {
            const match = output.match(/(\d+\.\d+)%/);
            if (match && match[1]) {
              progressPercent = parseFloat(match[1]);
              
              // Only emit progress updates if progress changed significantly
              const now = Date.now();
              if (progressPercent - lastProgressUpdate >= 5 || now - lastProgressUpdate >= 2000) {
                lastProgressUpdate = progressPercent;
                console.log(`Download progress: ${progressPercent}%`);
                if (socketId) {
                  io.to(socketId).emit('audioExtractionProgress', {
                    stage: 'download',
                    progress: 20 + (progressPercent * 0.7), // Map download progress to 20-90% of total progress
                    message: `Downloading audio: ${Math.floor(progressPercent)}%`
                  });
                }
              }
            }
          }
        });
        
        child.stderr.on('data', (data) => {
          console.error(`[yt-dlp error] ${data.toString().trim()}`);
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            console.log('yt-dlp process completed successfully');
            
            // Emit completed progress
            if (socketId) {
              io.to(socketId).emit('audioExtractionProgress', {
                stage: 'completed',
                progress: 100,
                message: 'Audio extraction completed!',
                audioPath: outputFilePath
              });
            }
            
            resolve();
          } else {
            console.error(`yt-dlp process failed with code ${code}`);
            reject(new Error(`yt-dlp exited with code ${code}`));
          }
        });
      });
      
      // Check file exists and has content
      if (!fs.existsSync(outputFilePath)) {
        console.error('Output file not found at expected path:', outputFilePath);
        
        // Check the temp directory to see if any files were created
        const files = fs.readdirSync(outputDir);
        console.log('Files in temp directory:', files);
        
        // Look for any similar files that might have been created
        const baseName = path.basename(outputFilePath, path.extname(outputFilePath));
        const similarFiles = files.filter(file => file.includes(baseName));
        
        if (similarFiles.length > 0) {
          console.log('Found similar files that may match our download:');
          similarFiles.forEach(file => {
            console.log(`- ${file}`);
          });
          
          // Use the first similar file
          const actualFilePath = path.join(outputDir, similarFiles[0]);
          console.log(`Using alternative file path: ${actualFilePath}`);
          
          // Copy to expected path
          if (actualFilePath !== outputFilePath) {
            fs.copyFileSync(actualFilePath, outputFilePath);
            console.log(`Copied from ${actualFilePath} to ${outputFilePath}`);
          }
        } else {
          throw new Error('No output audio files found after extraction');
        }
      }
      
      // Check file size
      const stats = fs.statSync(outputFilePath);
      console.log(`Output file size: ${Math.round(stats.size / 1024)} KB`);
      
      if (stats.size < 1024) {
        // File exists but is too small - probably failed
        throw new Error('Extracted audio file is too small, extraction may have failed');
      }
      
      // Return the path to the extracted audio file
      res.json({
        success: true,
        audioFilePath: outputFilePath,
        audioPath: outputFilePath,
        message: 'Audio extracted successfully',
        title: title
      });
      
    } catch (extractionError) {
      console.error('Error during audio extraction process:', extractionError);
      
      // Try with youtube-dl-exec as a last resort
      try {
        console.log('Primary extraction failed, trying with youtube-dl-exec fallback...');
        
        if (socketId) {
          io.to(socketId).emit('audioExtractionProgress', {
            stage: 'fallback',
            progress: 50,
            message: 'Primary extraction failed, trying alternative method...'
          });
        }
        
        await extractAudioWithYoutubeDl(videoUrl, outputFilePath);
        
        if (socketId) {
          io.to(socketId).emit('audioExtractionProgress', {
            stage: 'completed',
            progress: 100,
            message: 'Audio extraction completed with fallback method!',
            audioPath: outputFilePath
          });
        }
        
        // Check file exists and has content
        if (fs.existsSync(outputFilePath)) {
          const stats = fs.statSync(outputFilePath);
          console.log(`Output file size: ${Math.round(stats.size / 1024)} KB`);
          
          // Return the path to the extracted audio file
          return res.json({
            success: true,
            audioFilePath: outputFilePath,
            audioPath: outputFilePath,
            message: 'Audio extracted successfully using fallback method',
            title: title
          });
        } else {
          throw new Error('Fallback extraction did not produce an output file');
        }
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
        
        // Create a mock file for testing
        console.log('All extraction methods failed, creating fallback mock audio file');
        fs.writeFileSync(outputFilePath, 'Fallback audio file - extraction failed');
        
        if (socketId) {
          io.to(socketId).emit('audioExtractionProgress', {
            stage: 'warning',
            progress: 95,
            message: 'Warning: Extraction failed, using minimal fallback file'
          });
          
          // Still send completed to unblock the client
          io.to(socketId).emit('audioExtractionProgress', {
            stage: 'completed',
            progress: 100,
            message: 'Audio extraction process completed with issues - using fallback mechanism'
          });
        }
        
        // Return error response but with a path to the mock file to allow testing
        return res.status(500).json({
          error: 'Failed to extract audio',
          details: `${extractionError.message}; Fallback error: ${fallbackError.message}`,
          fallbackFile: outputFilePath,
          isFallback: true,
          success: false
        });
      }
    }
  } catch (error) {
    console.error('Error extracting YouTube audio:', error);
    const io = req.app.get('io');
    const socketId = req.body.socketId;
    
    if (socketId) {
      io.to(socketId).emit('audioExtractionProgress', {
        stage: 'error',
        progress: 0,
        message: `Error: ${error.message || 'Failed to extract audio'}`
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to extract audio from YouTube video',
      details: error.message,
      stack: error.stack
    });
  }
});

// Route to extract audio and transcribe in one process
router.post('/extract-and-transcribe', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const io = req.app.get('io');
    const socketId = req.body.socketId;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
    console.log('Attempting to extract audio and transcribe from:', videoUrl);
    
    // Emit initial progress update
    if (socketId) {
      io.to(socketId).emit('extractionProgress', {
        stage: 'initialized',
        progress: 0,
        message: 'Starting audio extraction and transcription process...'
      });
    }
    
    const outputDir = path.join(__dirname, '../temp');
    
    // Debug: Check if temp directory exists and is writable
    const dirExists = fs.existsSync(outputDir);
    console.log(`Temp directory exists: ${dirExists}`);
    if (!dirExists) {
      console.log('Creating output directory:', outputDir);
      try {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log('Directory created successfully');
      } catch (dirError) {
        console.error('Error creating temp directory:', dirError);
        return res.status(500).json({ 
          error: 'Failed to create temp directory', 
          details: dirError.message 
        });
      }
    }
    
    // Verify the directory is writable by writing a test file
    try {
      const testFile = path.join(outputDir, `test_${Date.now()}.txt`);
      fs.writeFileSync(testFile, 'Test file for directory write permission');
      console.log('Successfully wrote test file to temp directory');
      // Clean up test file
      fs.unlinkSync(testFile);
    } catch (writeError) {
      console.error('Directory is not writable:', writeError);
      return res.status(500).json({ 
        error: 'Temp directory is not writable', 
        details: writeError.message 
      });
    }
    
    // Generate a unique filename based on timestamp
    const timestamp = new Date().getTime();
    const outputFilePath = path.join(outputDir, `audio_${timestamp}.mp3`);
    
    // Emit progress update - getting video info
    if (socketId) {
      io.to(socketId).emit('extractionProgress', {
        stage: 'info',
        progress: 5,
        message: 'Fetching video information...'
      });
    }
    
    // Get video info with better error handling
    let videoInfo;
    try {
      console.log('Fetching video info...');
      try {
        videoInfo = await ytdl.getInfo(videoUrl);
        console.log('Successfully fetched video info for:', videoInfo.videoDetails.title);
      } catch (infoError) {
        // If standard method fails, try with different options
        console.log('Standard ytdl.getInfo failed, trying with custom options');
        const videoId = extractVideoId(videoUrl);
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        
        videoInfo = await ytdl.getInfo(url, {
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Referer': 'https://www.youtube.com/'
            }
          }
        });
        console.log('Successfully fetched video info with custom options');
      }
    } catch (infoError) {
      console.error('Error fetching video info:', infoError.message);
      
      // Try fallback method
      try {
        const videoId = extractVideoId(videoUrl);
        videoInfo = await retryOperationWithTimeout(async () => {
          return await fetchVideoInfoFallback(videoId);
        }, 20000, 2, 1000); // 20 sec timeout, 2 retries, 1 second initial delay
        console.log('Successfully fetched video info using fallback method');
      } catch (fallbackError) {
        console.error('Fallback video info also failed:', fallbackError.message);
        
        // Last resort: create minimal info
        videoInfo = { 
          videoDetails: { 
            title: `Unknown Video (${timestamp})`, 
            lengthSeconds: 300,
            videoId: extractVideoId(videoUrl) 
          }
        };
        console.log('Using minimal video info due to all methods failing');
      }
      
      // Report warning but continue
      if (socketId) {
        io.to(socketId).emit('extractionProgress', {
          stage: 'warning',
          progress: 10,
          message: `Warning: Video details fetching had issues. Continuing with extraction using limited information.`
        });
      }
    }
    
    const title = videoInfo.videoDetails.title;
    const videoLengthSeconds = parseInt(videoInfo.videoDetails.lengthSeconds) || 300;
    
    // Emit progress update - starting download
    if (socketId) {
      io.to(socketId).emit('extractionProgress', {
        stage: 'download',
        progress: 15,
        message: 'Starting audio download...',
        title: title,
        lengthSeconds: videoLengthSeconds
      });
    }
    
    try {
      // Download and convert to mp3 - USING DIRECT YT-DLP APPROACH FIRST
      console.log('Starting audio download using direct yt-dlp method...');
      
      // Use direct yt-dlp command which has proven to be reliable
      await new Promise((resolve, reject) => {
        // Create command arguments
        const args = [
          videoUrl,
          '--extract-audio',
          '--audio-format', 'mp3',
          '--audio-quality', '0',
          '-o', outputFilePath,
          '--no-check-certificate'
        ];
        
        console.log(`Executing direct yt-dlp command: yt-dlp ${args.join(' ')}`);
        const child = require('child_process').spawn('yt-dlp', args);
        
        let downloadProgress = '';
        let progressPercent = 0;
        let lastProgressUpdate = 0;
        
        child.stdout.on('data', (data) => {
          const output = data.toString();
          console.log(`[yt-dlp] ${output.trim()}`);
          
          // Parse progress information
          if (output.includes('[download]')) {
            const match = output.match(/(\d+\.\d+)%/);
            if (match && match[1]) {
              progressPercent = parseFloat(match[1]);
              
              // Only emit progress updates if progress changed by at least 5% or every 2 seconds
              const now = Date.now();
              if (progressPercent - lastProgressUpdate >= 5 || now - lastProgressUpdate >= 2000) {
                lastProgressUpdate = progressPercent;
                console.log(`Download progress: ${progressPercent}%`);
                if (socketId) {
                  io.to(socketId).emit('extractionProgress', {
                    stage: 'downloading',
                    progress: 15 + (progressPercent * 0.35), // Map download progress to 15-50% of total progress
                    message: `Downloading audio: ${Math.floor(progressPercent)}%`
                  });
                }
              }
            }
          }
        });
        
        child.stderr.on('data', (data) => {
          console.error(`[yt-dlp error] ${data.toString().trim()}`);
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            console.log('yt-dlp process completed successfully');
            
            // Emit converting progress
            if (socketId) {
              io.to(socketId).emit('extractionProgress', {
                stage: 'processing',
                progress: 50,
                message: 'Audio extraction completed. Preparing for transcription...'
              });
            }
            
            resolve();
          } else {
            console.error(`yt-dlp process failed with code ${code}`);
            reject(new Error(`yt-dlp exited with code ${code}`));
          }
        });
      });
      
      // Check file exists and has content
      if (!fs.existsSync(outputFilePath)) {
        console.error('Output file does not exist after download:', outputFilePath);
        
        // Check the temp directory to see if any files were created
        const files = fs.readdirSync(outputDir);
        console.log('Files in temp directory:', files);
        
        // Look for any similar files (yt-dlp might have renamed)
        const baseName = path.basename(outputFilePath, path.extname(outputFilePath));
        const similarFiles = files.filter(file => file.includes(baseName));
        
        if (similarFiles.length > 0) {
          console.log('Found similar files that may match our download:');
          similarFiles.forEach(file => {
            console.log(`- ${file}`);
          });
          
          // Use the first similar file
          const actualFilePath = path.join(outputDir, similarFiles[0]);
          console.log(`Using alternative file path: ${actualFilePath}`);
          
          // Copy to expected path if needed
          if (actualFilePath !== outputFilePath) {
            fs.copyFileSync(actualFilePath, outputFilePath);
            console.log(`Copied from ${actualFilePath} to ${outputFilePath}`);
          }
        } else {
          throw new Error('Output audio file was not created');
        }
      }
      
      const stats = fs.statSync(outputFilePath);
      console.log(`Output file size: ${Math.round(stats.size / 1024)} KB`);
      
      if (stats.size < 1024) {
        console.error('Audio file is too small:', stats.size, 'bytes');
        throw new Error('Extracted audio file is too small, extraction may have failed');
      }
      
      // Continue with transcription
      if (socketId) {
        io.to(socketId).emit('extractionProgress', {
          stage: 'transcribing',
          progress: 65,
          message: 'Starting transcription process...'
        });
      }
      
      // Prepare OpenAI API access
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }
      
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: openaiApiKey
      });
      
      console.log('Starting transcription with Whisper API');
      
      // Send progress update
      if (socketId) {
        io.to(socketId).emit('extractionProgress', {
          stage: 'transcribing',
          progress: 70,
          message: 'Transcribing audio with AI...'
        });
      }
      
      // Read audio file
      const audioFile = fs.createReadStream(outputFilePath);
      
      // Call Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
        response_format: 'text'
      });
      
      console.log('Transcription completed successfully');
      
      // Extract the transcribed text
      const transcribedText = typeof transcription === 'string' ? transcription : transcription.text;
      
      // Send completed progress
      if (socketId) {
        io.to(socketId).emit('extractionProgress', {
          stage: 'completed',
          progress: 100,
          message: 'Transcription completed successfully!',
          title: title
        });
      }
      
      // Return success with transcription
      res.json({
        success: true,
        videoInfo: {
          title: title,
          duration: videoLengthSeconds,
          videoId: videoInfo.videoDetails.videoId
        },
        transcription: transcribedText
      });
      
      // Cleanup: remove the audio file after successfully transcribing
      setTimeout(() => {
        try {
          if (fs.existsSync(outputFilePath)) {
            fs.unlinkSync(outputFilePath);
            console.log(`Cleaned up temporary audio file: ${outputFilePath}`);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up audio file:', cleanupError);
        }
      }, 5000); // 5 second delay to ensure file isn't still in use
      
    } catch (processingError) {
      console.error('Error during processing:', processingError);
      
      if (socketId) {
        io.to(socketId).emit('extractionProgress', {
          stage: 'error',
          progress: 0,
          message: `Error: ${processingError.message || 'Failed to process audio'}`
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to extract and transcribe audio',
        details: processingError.message
      });
    }
  } catch (error) {
    console.error('Error in extraction process:', error);
    
    const io = req.app.get('io');
    const socketId = req.body.socketId;
    
    if (socketId) {
      io.to(socketId).emit('extractionProgress', {
        stage: 'error',
        progress: 0,
        message: `Error: ${error.message || 'Unknown error occurred'}`
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to extract and transcribe YouTube video',
      details: error.message
    });
  }
});

// Route to get YouTube video info
router.get('/video-info', async (req, res) => {
  try {
    const { videoUrl } = req.query;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
    console.log('Received request for video info:', videoUrl);
    
    // First, clean the URL to remove tracking parameters
    const cleanUrl = cleanYouTubeUrl(videoUrl);
    console.log('Cleaned URL:', cleanUrl);
    
    // Try to get video ID
    let videoId;
    try {
      videoId = extractVideoId(cleanUrl);
      console.log(`Processing video ID: ${videoId}`);
    } catch (idError) {
      console.error('Error extracting video ID:', idError);
      return res.status(400).json({ error: 'Could not extract video ID from the provided URL. Please ensure it is a valid YouTube video URL.' });
    }
    
    // Set a short timeout for the initial ytdl-core attempt
    const timeout = 30000; // 30 seconds timeout (increased from 8 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('YouTube API request timed out')), timeout)
    );
    
    let info;
    let usedFallback = false;
    
    // Try multiple methods to get video info
    try {
      console.log('Attempting to fetch info with yt-dlp...');
      
      // Use youtube-dl-exec with retry mechanism
      const ytdlpResult = await retryOperationWithTimeout(async () => {
        return await youtubeDl(cleanUrl, {
          dumpSingleJson: true,
          noCheckCertificate: true,
          preferFreeFormats: true,
          skipDownload: true,
          simulate: true
        });
      }, 30000, 3, 2000); // 30 sec timeout, 3 retries, 2 second initial delay
      
      console.log('Successfully fetched video info using yt-dlp');
      
      // Convert yt-dlp output format to our expected format
      info = {
        videoDetails: {
          title: ytdlpResult.title,
          lengthSeconds: ytdlpResult.duration,
          author: { name: ytdlpResult.uploader },
          viewCount: ytdlpResult.view_count.toString(),
          publishDate: ytdlpResult.upload_date,
          description: ytdlpResult.description || '',
          thumbnails: ytdlpResult.thumbnails || [],
          videoId: videoId
        }
      };
    } catch (ytdlpError) {
      console.error('yt-dlp error:', ytdlpError.message);
      usedFallback = true;
      
      try {
        // Fallback to our custom method if yt-dlp fails
        console.log('Attempting to use fallback method...');
        info = await retryOperationWithTimeout(async () => {
          return await fetchVideoInfoFallback(videoId);
        }, 20000, 2, 1000); // 20 sec timeout, 2 retries, 1 second initial delay
        console.log('Successfully fetched video info using fallback method');
      } catch (fallbackError) {
        console.error('Fallback method error:', fallbackError.message);
        throw new Error(`Failed to fetch video information: ${fallbackError.message || ytdlpError.message}`);
      }
    }
    
    if (!info || !info.videoDetails) {
      throw new Error('Invalid video information received');
    }
    
    // Parse length in seconds if it's in ISO 8601 duration format (from API)
    let lengthSeconds = parseInt(info.videoDetails.lengthSeconds) || 0;
    if (isNaN(lengthSeconds) && typeof info.videoDetails.lengthSeconds === 'string') {
      const match = info.videoDetails.lengthSeconds.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      if (match) {
        const hours = (match[1] ? parseInt(match[1].replace('H', '')) : 0);
        const minutes = (match[2] ? parseInt(match[2].replace('M', '')) : 0);
        const seconds = (match[3] ? parseInt(match[3].replace('S', '')) : 0);
        lengthSeconds = hours * 3600 + minutes * 60 + seconds;
      }
    }
    
    // If length is still invalid, provide a reasonable default
    if (isNaN(lengthSeconds) || lengthSeconds <= 0) {
      lengthSeconds = 600; // Default to 10 minutes if length is unknown
    }
    
    // Ensure we have a valid thumbnail
    const thumbnailUrl = info.videoDetails.thumbnails && 
                        info.videoDetails.thumbnails[0] && 
                        info.videoDetails.thumbnails[0].url ? 
                        info.videoDetails.thumbnails[0].url : 
                        `https://img.youtube.com/vi/${videoId}/0.jpg`;
    
    // Make sure view count is a number
    const viewCount = parseInt(info.videoDetails.viewCount) || 0;
    
    const videoInfo = {
      title: info.videoDetails.title || `YouTube Video (${videoId})`,
      author: info.videoDetails.author?.name || 'YouTube Creator',
      length_seconds: lengthSeconds,
      publish_date: info.videoDetails.publishDate || new Date().toISOString().split('T')[0],
      views: viewCount,
      thumbnail_url: thumbnailUrl,
      description: info.videoDetails.description || '',
      video_id: videoId,
      usedFallback: usedFallback
    };
    
    // Add debug info
    console.log(`Successfully retrieved info for: "${videoInfo.title}" (${videoInfo.video_id})`);
    
    res.json(videoInfo);
  } catch (error) {
    console.error('Error getting YouTube video info:', error.message || error);
    
    // Check for specific error types
    if (error.message && error.message.includes('private video')) {
      return res.status(403).json({ error: 'This video is private or unavailable. Please try a different video.' });
    } else if (error.message && error.message.includes('copyright')) {
      return res.status(403).json({ error: 'This video has copyright restrictions. Please try a different video.' });
    } else if (error.message && error.message.includes('timed out')) {
      console.error('YouTube API timeout - details:', error);
      return res.status(408).json({ 
        error: 'The request to YouTube timed out. This could be due to YouTube API rate limits or network issues.',
        suggestions: [
          'Try again in a few minutes',
          'Use a different YouTube video URL',
          'Check your internet connection',
          'If the problem persists, YouTube may be experiencing service issues'
        ]
      });
    } else if (error.message && error.message.includes('Status code: 410')) {
      return res.status(410).json({ error: 'This video is no longer available. Please try a different video.' });
    }
    
    res.status(500).json({ error: 'Failed to fetch video information. Please check the URL and try again.' });
  }
});

// Helper function to clean YouTube URLs
function cleanYouTubeUrl(url) {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    
    // Keep only the essential query parameters (v)
    if (parsedUrl.hostname.includes('youtube.com')) {
      const videoId = parsedUrl.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    } else if (parsedUrl.hostname.includes('youtu.be')) {
      const pathParts = parsedUrl.pathname.split('/');
      const videoId = pathParts[pathParts.length - 1];
      if (videoId) {
        return `https://youtu.be/${videoId}`;
      }
    }
    
    // If we couldn't clean it, return the original
    return url;
  } catch (e) {
    // If URL parsing fails, just return the original
    return url;
  }
}

module.exports = router;