const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Test direct yt-dlp extraction
async function testYtDlpExtraction() {
  console.log('====================================================');
  console.log('Testing direct yt-dlp extraction');
  console.log('====================================================');
  
  const testUrl = 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Chicken Pot Pie recipe
  const outputDir = path.join(__dirname, 'temp');
  const timestamp = new Date().getTime();
  const outputFilePath = path.join(outputDir, `audio_fallback_${timestamp}.mp3`);
  
  console.log(`Test URL: ${testUrl}`);
  console.log(`Output path: ${outputFilePath}`);
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    console.log('Creating output directory:', outputDir);
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Try direct yt-dlp command
    console.log('\nRunning direct yt-dlp command...');
    
    // Create command arguments
    const args = [
      testUrl,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', outputFilePath,
      '--no-check-certificate'
    ];
    
    console.log(`Executing: yt-dlp ${args.join(' ')}`);
    
    // Execute the command
    await new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', args);
      
      child.stdout.on('data', (data) => {
        console.log(`[yt-dlp] ${data.toString().trim()}`);
      });
      
      child.stderr.on('data', (data) => {
        console.error(`[yt-dlp error] ${data.toString().trim()}`);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log('yt-dlp command completed successfully');
          resolve();
        } else {
          console.error(`yt-dlp command failed with code ${code}`);
          reject(new Error(`yt-dlp exited with code ${code}`));
        }
      });
    });
    
    // Check if file exists
    console.log('\nChecking for output file...');
    
    // Look for file with the exact path
    if (fs.existsSync(outputFilePath)) {
      const stats = fs.statSync(outputFilePath);
      console.log(`File exists at expected path: ${outputFilePath}`);
      console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
      console.log('Extraction successful!');
    } else {
      // Look for files with similar name (yt-dlp might have added extensions)
      console.log('Expected file not found, checking for similar files...');
      
      const baseName = path.basename(outputFilePath, path.extname(outputFilePath));
      const dirContents = fs.readdirSync(outputDir);
      const similarFiles = dirContents.filter(file => file.includes(baseName));
      
      if (similarFiles.length > 0) {
        console.log('Found similar files:');
        similarFiles.forEach(file => {
          const filePath = path.join(outputDir, file);
          const stats = fs.statSync(filePath);
          console.log(`- ${file} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
        });
      } else {
        console.log('No similar files found. Checking all recent files...');
        
        // Get files modified in the last minute
        const now = Date.now();
        const recentFiles = dirContents
          .filter(file => {
            const stats = fs.statSync(path.join(outputDir, file));
            return (now - stats.mtime.getTime()) < 60000; // Last minute
          });
        
        if (recentFiles.length > 0) {
          console.log('Recent files in temp directory:');
          recentFiles.forEach(file => {
            const filePath = path.join(outputDir, file);
            const stats = fs.statSync(filePath);
            console.log(`- ${file} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
          });
        } else {
          console.log('No recent files found in directory');
          throw new Error('Extraction failed - no output files found');
        }
      }
    }
    
    console.log('\n====================================================');
    console.log('Test completed successfully');
    console.log('====================================================');
    
  } catch (error) {
    console.error('\n====================================================');
    console.error('Test failed with error:', error);
    console.error('====================================================');
  }
}

// Run the test
testYtDlpExtraction(); 