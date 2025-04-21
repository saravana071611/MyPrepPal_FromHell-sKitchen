const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Route to extract audio from YouTube video
router.post('/extract-audio', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
    const outputDir = path.join(__dirname, '../temp');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate a unique filename based on timestamp
    const timestamp = new Date().getTime();
    const outputFilePath = path.join(outputDir, `audio_${timestamp}.mp3`);
    
    // Get video info
    const videoInfo = await ytdl.getInfo(videoUrl);
    const title = videoInfo.videoDetails.title;
    
    // Download and convert to mp3
    const stream = ytdl(videoUrl, { 
      quality: 'highestaudio',
      filter: 'audioonly' 
    });
    
    // Process with ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(stream)
        .audioBitrate(128)
        .save(outputFilePath)
        .on('end', () => {
          console.log(`Downloaded and converted audio: ${title}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error downloading audio:', err);
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
    
    // Get video info using ytdl-core
    const info = await ytdl.getInfo(videoUrl);
    
    const videoInfo = {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      length_seconds: parseInt(info.videoDetails.lengthSeconds),
      publish_date: info.videoDetails.publishDate,
      views: parseInt(info.videoDetails.viewCount),
      thumbnail_url: info.videoDetails.thumbnails[0].url,
      description: info.videoDetails.description,
      video_id: info.videoDetails.videoId
    };
    
    res.json(videoInfo);
  } catch (error) {
    console.error('Error getting YouTube video info:', error);
    res.status(500).json({ error: 'Failed to get YouTube video info' });
  }
});

module.exports = router;