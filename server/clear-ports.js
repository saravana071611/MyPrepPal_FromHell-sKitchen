const { execSync } = require('child_process');
const os = require('os');

console.log('Checking for running Node.js processes...');

try {
  if (os.platform() === 'win32') {
    // Get a list of Node.js processes
    const processListOutput = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV').toString();
    
    // Parse the CSV output
    const lines = processListOutput.split('\n').filter(line => line.trim().length > 0);
    
    // Skip the header line
    if (lines.length > 1) {
      console.log(`Found ${lines.length - 1} Node.js processes running.`);
      
      // Kill each Node.js process
      console.log('Terminating all Node.js processes...');
      execSync('taskkill /F /IM node.exe', { stdio: 'inherit' });
      console.log('All Node.js processes terminated.');
    } else {
      console.log('No Node.js processes found running.');
    }
  } else {
    // For Unix-like systems (Linux, macOS)
    console.log('Terminating all Node.js processes...');
    execSync('pkill -f node || true', { stdio: 'inherit' });
    console.log('All Node.js processes terminated (if any were running).');
  }
} catch (error) {
  console.error('Error while clearing ports:', error.message);
  // Don't exit with error code as this shouldn't prevent server from starting
}

console.log('Ports should now be cleared. You can start the server.'); 