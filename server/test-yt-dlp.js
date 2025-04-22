const path = require('path');
const fs = require('fs');
const youtubeDl = require('youtube-dl-exec');
const { spawn } = require('child_process');
const util = require('util');

// Test URL - you can change this to any YouTube video
const testUrl = 'https://www.youtube.com/watch?v=W1XELWKaCi4'; // Chicken Pot Pie recipe

// Create temp directory if it doesn't exist
const outputDir = path.join(__dirname, 'temp');
if (!fs.existsSync(outputDir)) {
  console.log(`Creating temp directory: ${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
}

// Output path for the audio file - make sure extension handling is correct
const timestamp = new Date().getTime();
const outputFilename = `test_audio_${timestamp}`;
const outputPath = path.join(outputDir, outputFilename);

console.log('===== YouTube-DL Test Script =====');
console.log(`Test URL: ${testUrl}`);
console.log(`Output path base: ${outputPath}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`Output directory: ${outputDir}`);

// List the files in the temp directory
console.log('\nCurrent files in temp directory:');
if (fs.existsSync(outputDir)) {
  const files = fs.readdirSync(outputDir);
  if (files.length === 0) {
    console.log('(empty directory)');
  } else {
    files.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      console.log(`- ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
  }
} else {
  console.log('Temp directory does not exist yet');
}

async function testYtDlpDirectly() {
  console.log('\n----- Testing yt-dlp directly -----');
  
  return new Promise((resolve) => {
    try {
      // Check if yt-dlp is in PATH by running a version check
      const child = spawn('yt-dlp', ['--version']);
      
      let version = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        version += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`yt-dlp stderr: ${data}`);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`yt-dlp is available in PATH, version: ${version.trim()}`);
          resolve(true);
        } else {
          console.error(`yt-dlp command failed with exit code ${code}`);
          console.error(`Error output: ${errorOutput}`);
          resolve(false);
        }
      });
    } catch (error) {
      console.error('Failed to execute yt-dlp command:', error.message);
      resolve(false);
    }
  });
}

async function testYtDlpDownload() {
  console.log('\n----- Testing yt-dlp direct download -----');
  
  return new Promise((resolve) => {
    try {
      // Create output file path with mp3 extension
      const mp3OutputPath = path.join(outputDir, `${outputFilename}_direct.mp3`);
      console.log(`Direct download output path: ${mp3OutputPath}`);
      
      // Run yt-dlp directly
      const args = [
        testUrl,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '-o', mp3OutputPath
      ];
      
      console.log(`Executing command: yt-dlp ${args.join(' ')}`);
      const child = spawn('yt-dlp', args);
      
      let outputLog = '';
      let errorLog = '';
      
      child.stdout.on('data', (data) => {
        const output = data.toString();
        outputLog += output;
        console.log(`yt-dlp output: ${output}`);
      });
      
      child.stderr.on('data', (data) => {
        const errOutput = data.toString();
        errorLog += errOutput;
        console.error(`yt-dlp error: ${errOutput}`);
      });
      
      child.on('close', (code) => {
        console.log(`yt-dlp process exited with code ${code}`);
        
        if (code === 0) {
          // Check if file exists
          console.log('Checking for output files...');
          
          // Look for any MP3 files in the output directory
          const mp3Files = fs.readdirSync(outputDir).filter(file => 
            file.includes(outputFilename) || file.endsWith('.mp3')
          );
          
          if (mp3Files.length > 0) {
            console.log('Found these potential output files:');
            mp3Files.forEach(file => {
              const filePath = path.join(outputDir, file);
              const stats = fs.statSync(filePath);
              console.log(`- ${file} (${(stats.size / (1024)).toFixed(2)} KB)`);
            });
            resolve(true);
          } else {
            console.log('No matching output files found after direct download');
            console.log('Full directory contents:');
            fs.readdirSync(outputDir).forEach(file => {
              console.log(`- ${file}`);
            });
            resolve(false);
          }
        } else {
          console.error('Direct yt-dlp download failed');
          console.error(`Full error log: ${errorLog}`);
          resolve(false);
        }
      });
    } catch (error) {
      console.error('Failed to execute direct yt-dlp download:', error.message);
      resolve(false);
    }
  });
}

async function testWithYoutubeDlExec() {
  console.log('\n----- Testing youtube-dl-exec -----');
  try {
    console.log('Starting download with youtube-dl-exec...');
    
    // Create proper output path
    const execOutputPath = path.join(outputDir, `${outputFilename}_exec`);
    console.log(`youtube-dl-exec output path: ${execOutputPath}`);
    
    // Execute youtube-dl with detailed options and verbose output
    const options = {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0, // Best quality
      output: execOutputPath,
      noCheckCertificate: true,
      verbose: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    };
    
    console.log('Options:', util.inspect(options, { depth: null }));
    
    const result = await youtubeDl(testUrl, options);
    console.log('Download command completed successfully!');
    console.log('Command output:', result);
    
    // Check for mp3 files
    const mp3Files = fs.readdirSync(outputDir).filter(file => 
      file.startsWith(path.basename(outputFilename)) || 
      file.includes('_exec') || 
      file.endsWith('.mp3')
    );
    
    if (mp3Files.length > 0) {
      console.log('Found these potential output files:');
      mp3Files.forEach(file => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        console.log(`- ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
      return true;
    } else {
      console.error('Expected output files not found after download');
      
      // Look for any files created in the output directory
      console.log('All files in output directory:');
      fs.readdirSync(outputDir).forEach(file => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        console.log(`- ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
      
      return false;
    }
  } catch (error) {
    console.error('Error using youtube-dl-exec:', error.message);
    if (error.stderr) {
      console.error('Error details:', error.stderr);
    }
    if (error.stdout) {
      console.log('Command output:', error.stdout);
    }
    return false;
  }
}

// Run tests
async function runTests() {
  // Test if yt-dlp is available
  const ytdlpAvailable = await testYtDlpDirectly();
  
  // Test direct download with yt-dlp
  let directDownloadSuccess = false;
  if (ytdlpAvailable) {
    directDownloadSuccess = await testYtDlpDownload();
  }
  
  // Test with youtube-dl-exec package
  const execSuccess = await testWithYoutubeDlExec();
  
  // List all files in temp directory after tests
  console.log('\nFiles in temp directory after tests:');
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir);
    if (files.length === 0) {
      console.log('(empty directory)');
    } else {
      files.forEach(file => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        console.log(`- ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
    }
  }
  
  console.log('\n===== Test Results =====');
  console.log(`yt-dlp availability: ${ytdlpAvailable ? 'YES' : 'NO'}`);
  console.log(`yt-dlp direct download: ${directDownloadSuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log(`youtube-dl-exec test: ${execSuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log('Check the console output above for more details.');
}

runTests(); 