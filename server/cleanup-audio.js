/**
 * Simple Audio File Cleanup Script
 * This script removes only audio files from specified directories
 */

const fs = require('fs');
const path = require('path');

// Define audio file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.flac'];

// Define directories to clean
const DIRECTORIES = [
  path.join(__dirname, 'temp'),
  path.join(__dirname, 'data', 'temp')
];

// Function to check if a file is an audio file
function isAudioFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext);
}

// Main cleanup function
function cleanupAudioFiles() {
  console.log('Starting audio file cleanup...');
  
  let totalDeleted = 0;
  let totalBytes = 0;
  let errors = 0;
  
  // Process each directory
  DIRECTORIES.forEach(dir => {
    // Skip if directory doesn't exist
    if (!fs.existsSync(dir)) {
      console.log(`Directory doesn't exist: ${dir}`);
      return;
    }
    
    console.log(`\nCleaning directory: ${dir}`);
    
    try {
      // Get all files in directory
      const files = fs.readdirSync(dir);
      
      // Find audio files
      const audioFiles = files.filter(file => isAudioFile(file));
      console.log(`Found ${audioFiles.length} audio files to delete`);
      
      // Delete each audio file
      audioFiles.forEach(file => {
        try {
          const filePath = path.join(dir, file);
          
          // Double-check it's an audio file (should be redundant)
          if (isAudioFile(file)) {
            // Get file size before deleting
            const stats = fs.statSync(filePath);
            const fileSizeKB = Math.round(stats.size / 1024);
            
            // Delete the file
            fs.unlinkSync(filePath);
            
            totalDeleted++;
            totalBytes += stats.size;
            console.log(`Deleted: ${file} (${fileSizeKB} KB)`);
          }
        } catch (err) {
          console.error(`Error deleting file ${file}: ${err.message}`);
          errors++;
        }
      });
      
      // List remaining files for verification
      const remainingFiles = fs.readdirSync(dir);
      console.log(`Remaining files in ${path.basename(dir)}: ${remainingFiles.length}`);
      if (remainingFiles.length > 0) {
        console.log('  ' + remainingFiles.join(', '));
      }
    } catch (err) {
      console.error(`Error processing directory ${dir}: ${err.message}`);
      errors++;
    }
  });
  
  console.log('\nCleanup Summary:');
  console.log(`- Files deleted: ${totalDeleted}`);
  console.log(`- Space reclaimed: ${Math.round(totalBytes / 1024)} KB`);
  console.log(`- Errors encountered: ${errors}`);
  
  return {
    deleted: totalDeleted,
    bytes: totalBytes,
    errors: errors
  };
}

// Run cleanup if this script is called directly
if (require.main === module) {
  const result = cleanupAudioFiles();
  
  if (result.deleted > 0) {
    console.log('Cleanup successful!');
  } else if (result.errors > 0) {
    console.log('Cleanup completed with errors.');
  } else {
    console.log('No audio files to clean up.');
  }
}

// Export the function for use in other files
module.exports = cleanupAudioFiles; 