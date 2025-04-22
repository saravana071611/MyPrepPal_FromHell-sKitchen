const path = require('path');
const fs = require('fs');
const { extractAudioWithYoutubeDl } = require('./routes/youtube');

// Extract the function definition if it's not exported
// This is because the function isn't exported in the original file
function extractAudio(videoUrl, outputFilePath) {
  console.log('====================================================');
  console.log('Starting manual audio extraction test...');
  console.log(`URL: ${videoUrl}`);
  console.log(`Output path: ${outputFilePath}`);
  console.log('====================================================');
  
  // First, try to run our version with direct spawning
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    
    // Create necessary directories
    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate the command arguments
    const args = [
      videoUrl,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', outputFilePath,
      '--no-check-certificate'
    ];
    
    console.log(`Running command: yt-dlp ${args.join(' ')}`);
    const child = spawn('yt-dlp', args);
    
    let stdoutData = '';
    let stderrData = '';
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      console.log(`[yt-dlp] ${output.trim()}`);
    });
    
    child.stderr.on('data', (data) => {
      const errOutput = data.toString();
      stderrData += errOutput;
      console.error(`[yt-dlp error] ${errOutput.trim()}`);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('yt-dlp process completed successfully!');
        
        // Check for output files
        let foundFile = null;
        if (fs.existsSync(outputFilePath)) {
          foundFile = outputFilePath;
          console.log(`Found output file at expected path: ${outputFilePath}`);
        } else {
          // Check for files with similar names (e.g., if extension was changed)
          const baseName = path.basename(outputFilePath, path.extname(outputFilePath));
          const dirPath = path.dirname(outputFilePath);
          const files = fs.readdirSync(dirPath);
          
          for (const file of files) {
            if (file.includes(baseName)) {
              foundFile = path.join(dirPath, file);
              console.log(`Found alternative output file: ${foundFile}`);
              break;
            }
          }
        }
        
        if (foundFile) {
          const stats = fs.statSync(foundFile);
          console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
          resolve({ success: true, filePath: foundFile, size: stats.size });
        } else {
          console.error('No output file found!');
          resolve({ success: false, error: 'No output file was created' });
        }
      } else {
        console.error(`yt-dlp process failed with code ${code}`);
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

// Run the test
async function runTest() {
  try {
    const testUrl = 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Chicken Pot Pie recipe
    const outputDir = path.join(__dirname, 'temp');
    const timestamp = new Date().getTime();
    const outputFile = path.join(outputDir, `test_api_${timestamp}.mp3`);
    
    console.log('Testing audio extraction...');
    console.log(`Test URL: ${testUrl}`);
    console.log(`Output file: ${outputFile}`);
    
    // Make sure temp directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const result = await extractAudio(testUrl, outputFile);
    
    console.log('\n====================================================');
    console.log('Test Result:');
    console.log(`Success: ${result.success}`);
    
    if (result.success) {
      console.log(`File Path: ${result.filePath}`);
      console.log(`File Size: ${(result.size / (1024 * 1024)).toFixed(2)} MB`);
    } else {
      console.error(`Error: ${result.error}`);
    }
    console.log('====================================================');
    
    // List all files in temp directory 
    console.log('\nFiles in temp directory:');
    const files = fs.readdirSync(outputDir);
    files.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      console.log(`- ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Start the test
runTest(); 