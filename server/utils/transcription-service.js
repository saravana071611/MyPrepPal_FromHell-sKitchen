/**
 * Transcription Service
 * 
 * This service handles:
 * 1. Audio extraction from YouTube videos using yt-dlp
 * 2. Transcription using OpenAI Whisper API
 * 3. Storage of both audio and transcription files
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { OpenAI } = require('openai');

class TranscriptionService {
  constructor(options = {}) {
    this.tempDir = options.tempDir || path.join(__dirname, '../temp');
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.openai = new OpenAI({ apiKey: this.apiKey });
    this.maxRetries = options.maxRetries || 2;
    this.debug = options.debug || false;
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    this.log('TranscriptionService initialized');
  }
  
  /**
   * Extract audio from a YouTube video and transcribe it
   */
  async extractAndTranscribe(videoUrl, options = {}) {
    this.log(`Starting extraction and transcription for: ${videoUrl}`);
    
    // Generate unique file names
    const timestamp = Date.now();
    const audioFileName = `audio_${timestamp}.mp3`;
    const audioFilePath = path.join(this.tempDir, audioFileName);
    
    try {
      // Step 1: Extract audio
      this.log('Extracting audio...');
      const { success, filePath } = await this.extractAudio(videoUrl, audioFilePath, options);
      
      if (!success) {
        throw new Error('Audio extraction failed');
      }
      
      this.log(`Audio extracted successfully to: ${filePath}`);
      
      // Step 2: Transcribe audio
      this.log('Transcribing audio...');
      const transcription = await this.transcribeAudio(filePath, options);
      
      // Step 3: Save transcription
      const transcriptionFileName = `transcription_${timestamp}.json`;
      const transcriptionFilePath = path.join(this.tempDir, transcriptionFileName);
      
      fs.writeFileSync(
        transcriptionFilePath,
        JSON.stringify(transcription, null, 2)
      );
      
      // Also save a text-only version
      const textOnlyFilePath = path.join(this.tempDir, `transcription_text_${timestamp}.txt`);
      fs.writeFileSync(textOnlyFilePath, transcription.text);
      
      this.log('Transcription completed and saved');
      
      // Return results
      return {
        success: true,
        audioFile: {
          name: audioFileName,
          path: filePath,
          size: fs.statSync(filePath).size
        },
        transcription: {
          text: transcription.text,
          jsonPath: transcriptionFilePath,
          textPath: textOnlyFilePath
        }
      };
      
    } catch (error) {
      this.log(`Error in extractAndTranscribe: ${error.message}`, true);
      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  }
  
  /**
   * Extract audio from a YouTube video using yt-dlp
   */
  async extractAudio(videoUrl, outputFilePath, options = {}) {
    return new Promise((resolve) => {
      this.log(`Extracting audio from: ${videoUrl} to ${outputFilePath}`);
      
      // Generate command arguments
      const args = [
        videoUrl,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '-o', outputFilePath,
        '--no-check-certificate'
      ];
      
      if (options.verbose) {
        args.push('--verbose');
      }
      
      this.log(`Running command: yt-dlp ${args.join(' ')}`);
      const child = spawn('yt-dlp', args);
      
      let stdoutData = '';
      let stderrData = '';
      
      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdoutData += output;
        this.log(`[yt-dlp] ${output.trim()}`);
        
        // Parse progress information
        if (output.includes('[download]') && options.progressCallback) {
          const match = output.match(/(\d+\.\d+)%/);
          if (match && match[1]) {
            const progressPercent = parseFloat(match[1]);
            options.progressCallback({
              stage: 'downloading',
              progress: progressPercent,
              message: `Downloading audio: ${Math.floor(progressPercent)}%`
            });
          }
        }
      });
      
      child.stderr.on('data', (data) => {
        const errOutput = data.toString();
        stderrData += errOutput;
        this.log(`[yt-dlp error] ${errOutput.trim()}`, true);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          this.log('yt-dlp process completed successfully');
          
          // Check for output files
          if (options.progressCallback) {
            options.progressCallback({
              stage: 'processing',
              progress: 50,
              message: 'Audio extraction completed'
            });
          }
          
          // Check if file exists
          if (fs.existsSync(outputFilePath)) {
            const stats = fs.statSync(outputFilePath);
            this.log(`Found output file at expected path: ${outputFilePath}`);
            this.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
            resolve({ success: true, filePath: outputFilePath, size: stats.size });
          } else {
            // Check for files with similar names (e.g., if extension was changed)
            const baseName = path.basename(outputFilePath, path.extname(outputFilePath));
            const dirPath = path.dirname(outputFilePath);
            const files = fs.readdirSync(dirPath);
            
            let foundFile = null;
            for (const file of files) {
              if (file.includes(baseName)) {
                foundFile = path.join(dirPath, file);
                this.log(`Found alternative output file: ${foundFile}`);
                break;
              }
            }
            
            if (foundFile) {
              const stats = fs.statSync(foundFile);
              
              // Copy to expected path if needed
              if (foundFile !== outputFilePath) {
                fs.copyFileSync(foundFile, outputFilePath);
                this.log(`Copied from ${foundFile} to ${outputFilePath}`);
              }
              
              resolve({ success: true, filePath: outputFilePath, size: stats.size });
            } else {
              this.log('No output file found!', true);
              resolve({ success: false, error: 'No output file was created' });
            }
          }
        } else {
          this.log(`yt-dlp process failed with code ${code}`, true);
          resolve({ 
            success: false, 
            error: `Process exited with code ${code}`,
            stdout: stdoutData,
            stderr: stderrData
          });
        }
      });
    });
  }
  
  /**
   * Transcribe audio file using OpenAI Whisper API
   */
  async transcribeAudio(audioFilePath, options = {}) {
    this.log(`Transcribing audio: ${audioFilePath}`);
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required for transcription');
    }
    
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }
    
    // Notify progress
    if (options.progressCallback) {
      options.progressCallback({
        stage: 'transcribing',
        progress: 60,
        message: 'Starting transcription with Whisper API'
      });
    }
    
    // Read audio file
    const audioFile = fs.createReadStream(audioFilePath);
    
    // Configure transcription options
    const transcriptionOptions = {
      file: audioFile,
      model: options.model || 'whisper-1',
      language: options.language || 'en',
      response_format: options.format || 'verbose_json',
      temperature: options.temperature || 0,
      prompt: options.prompt || ''
    };
    
    // Call Whisper API
    const startTime = Date.now();
    let transcription;
    
    try {
      this.log('Calling OpenAI Whisper API...');
      transcription = await this.openai.audio.transcriptions.create(transcriptionOptions);
      const endTime = Date.now();
      const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
      
      this.log(`Transcription completed in ${durationSeconds} seconds`);
      this.log(`Text length: ${transcription.text.length} characters`);
      
      // Update progress
      if (options.progressCallback) {
        options.progressCallback({
          stage: 'completed',
          progress: 100,
          message: 'Transcription completed successfully!'
        });
      }
      
      return transcription;
    } catch (error) {
      this.log(`Error in Whisper API call: ${error.message}`, true);
      
      // Update progress
      if (options.progressCallback) {
        options.progressCallback({
          stage: 'error',
          progress: 0,
          message: `Transcription error: ${error.message}`
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Cleanup temporary files
   */
  cleanup(filePaths, options = {}) {
    const delay = options.delay || 5000; // Default 5 second delay
    
    setTimeout(() => {
      if (Array.isArray(filePaths)) {
        filePaths.forEach(filePath => {
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              this.log(`Deleted file: ${filePath}`);
            } catch (e) {
              this.log(`Error deleting file ${filePath}: ${e.message}`, true);
            }
          }
        });
      } else if (filePaths) {
        if (fs.existsSync(filePaths)) {
          try {
            fs.unlinkSync(filePaths);
            this.log(`Deleted file: ${filePaths}`);
          } catch (e) {
            this.log(`Error deleting file ${filePaths}: ${e.message}`, true);
          }
        }
      }
    }, delay);
  }
  
  /**
   * Logging helper
   */
  log(message, isError = false) {
    if (this.debug) {
      if (isError) {
        console.error(`[TranscriptionService] ${message}`);
      } else {
        console.log(`[TranscriptionService] ${message}`);
      }
    }
  }
}

module.exports = TranscriptionService; 