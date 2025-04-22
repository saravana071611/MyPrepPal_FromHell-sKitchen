const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const axios = require('axios');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Helper function to extract video ID from various YouTube URL formats
function extractVideoId(url) {
  // Try standard ytdl-core method first
  try {
    return ytdl.getVideoID(url);
  } catch (e) {
    // Fallback to manual extraction if ytdl-core fails
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

// Route to extract audio from YouTube video
router.post('/extract-audio', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const io = req.app.get('io');
    const socketId = req.body.socketId;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
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
    
    // Get video info
    const videoInfo = await ytdl.getInfo(videoUrl);
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
    
    // Download and convert to mp3
    const stream = ytdl(videoUrl, { 
      quality: 'highestaudio',
      filter: 'audioonly' 
    });
    
    let downloadProgress = 0;
    let lastProgressUpdate = 0;
    
    stream.on('progress', (chunkLength, downloaded, total) => {
      // Calculate progress percentage
      downloadProgress = Math.floor((downloaded / total) * 100);
      
      // Only emit progress updates if progress changed by at least 5% or every 2 seconds
      const now = Date.now();
      if (downloadProgress - lastProgressUpdate >= 5 || now - lastProgressUpdate >= 2000) {
        lastProgressUpdate = downloadProgress;
        if (socketId) {
          io.to(socketId).emit('audioExtractionProgress', {
            stage: 'download',
            progress: 20 + (downloadProgress * 0.6), // Map download progress to 20-80% of total progress
            message: `Downloading audio: ${downloadProgress}%`
          });
        }
      }
    });
    
    // Process with ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(stream)
        .audioBitrate(128)
        .save(outputFilePath)
        .on('progress', (progress) => {
          if (socketId && progress.percent) {
            io.to(socketId).emit('audioExtractionProgress', {
              stage: 'processing',
              progress: 80 + (progress.percent * 0.2), // Map conversion progress to 80-100% of total progress
              message: `Processing audio: ${Math.floor(progress.percent)}%`
            });
          }
        })
        .on('end', () => {
          console.log(`Downloaded and converted audio: ${title}`);
          if (socketId) {
            io.to(socketId).emit('audioExtractionProgress', {
              stage: 'completed',
              progress: 100,
              message: 'Audio extraction completed!'
            });
          }
          resolve();
        })
        .on('error', (err) => {
          console.error('Error downloading audio:', err);
          if (socketId) {
            io.to(socketId).emit('audioExtractionProgress', {
              stage: 'error',
              progress: 0,
              message: `Error: ${err.message || 'Failed to process audio'}`
            });
          }
          reject(err);
        });
    });
    
    // Return the path to the extracted audio file
    res.json({
      success: true,
      audioFilePath: outputFilePath,
      message: 'Audio extracted successfully',
      title: title
    });
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
    
    res.status(500).json({ error: 'Failed to extract audio from YouTube video' });
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
    const timeout = 8000; // 8 seconds timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('YouTube API request timed out')), timeout)
    );
    
    let info;
    let usedFallback = false;
    
    // Try multiple methods to get video info
    try {
      console.log('Attempting to fetch info with ytdl-core...');
      
      // First try with ytdl-core
      const infoPromise = ytdl.getInfo(cleanUrl);
      info = await Promise.race([infoPromise, timeoutPromise]);
      console.log('Successfully fetched video info using ytdl-core');
    } catch (ytdlError) {
      console.error('ytdl-core error:', ytdlError.message);
      usedFallback = true;
      
      try {
        // Fallback to our custom method if ytdl-core fails
        console.log('Attempting to use fallback method...');
        info = await fetchVideoInfoFallback(videoId);
        console.log('Successfully fetched video info using fallback method');
      } catch (fallbackError) {
        console.error('Fallback method error:', fallbackError.message);
        throw new Error(`Failed to fetch video information: ${fallbackError.message || ytdlError.message}`);
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
      return res.status(408).json({ error: 'The request to YouTube timed out. Please try again or use a different video.' });
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