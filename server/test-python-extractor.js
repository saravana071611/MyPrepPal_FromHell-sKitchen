/**
 * Test for Python-based YouTube audio extraction
 * This script demonstrates how to call the Python extractor from Node.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Settings
const pythonScript = path.join(__dirname, 'python', 'yt_extract.py');
const outputDir = path.join(__dirname, 'temp');
const videoUrl = 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Example video
const outputPath = path.join(outputDir, `py_extract_${Date.now()}`);
const timeoutSeconds = 60;

// Create output directory if needed
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('TEST: Python-based YouTube Audio Extraction');
console.log('------------------------------------------');
console.log(`Video URL: ${videoUrl}`);
console.log(`Output Path: ${outputPath}`);
console.log(`Python Script: ${pythonScript}`);
console.log(`Timeout: ${timeoutSeconds} seconds`);
console.log('------------------------------------------\n');

/**
 * Extract audio using the Python script
 * @param {string} url YouTube URL
 * @param {string} output Output file path (without extension)
 * @param {number} timeout Timeout in seconds
 * @returns {Promise<string>} Path to the extracted audio file
 */
function extractAudioWithPython(url, output, timeout) {
  return new Promise((resolve, reject) => {
    // Run the Python script
    const pythonProcess = spawn('python', [
      pythonScript,
      url,
      output,
      timeout.toString()
    ]);
    
    // Collect stdout data
    let stdoutData = '';
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      stdoutData += output;
    });
    
    // Collect stderr data
    let stderrData = '';
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`Python Error: ${output}`);
      stderrData += output;
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Try to extract the output path from stdout
        const expectedPath = `${output}.mp3`;
        if (fs.existsSync(expectedPath)) {
          resolve(expectedPath);
        } else {
          // Look for any newly created MP3 file in the output directory
          const outputDir = path.dirname(output);
          const files = fs.readdirSync(outputDir)
            .filter(file => file.endsWith('.mp3'))
            .map(file => path.join(outputDir, file))
            .filter(file => fs.statSync(file).mtime > startTime);
          
          if (files.length > 0) {
            resolve(files[0]);
          } else {
            reject(new Error("Extraction succeeded but couldn't find output file"));
          }
        }
      } else {
        reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
      }
    });
    
    // Handle process error
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

// Track start time
const startTime = new Date();

// Run the extraction
console.log('Starting extraction...');
extractAudioWithPython(videoUrl, outputPath, timeoutSeconds)
  .then((audioPath) => {
    const duration = (new Date() - startTime) / 1000;
    console.log(`\nExtraction successful! Audio saved to: ${audioPath}`);
    console.log(`Total time: ${duration.toFixed(2)} seconds`);
    
    // Get file size
    const stats = fs.statSync(audioPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
  })
  .catch((error) => {
    console.error(`\nExtraction failed: ${error.message}`);
  }); 