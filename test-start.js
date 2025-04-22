/**
 * Simple test script to start the server and client
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('========================================');
console.log('  TEST START SCRIPT FOR MYPREPPAL APP');
console.log('========================================');

// First, kill any existing Node processes
try {
  console.log('\nStopping any existing Node processes...');
  if (process.platform === 'win32') {
    execSync('taskkill /F /IM node.exe', { stdio: 'inherit' });
    console.log('Existing Node processes terminated.');
  } else {
    execSync('pkill -f node || true', { stdio: 'inherit' });
    console.log('Existing Node processes terminated.');
  }
} catch (error) {
  console.log('No existing Node processes found or error terminating:', error.message);
}

// Wait a moment for ports to be freed
console.log('\nWaiting for ports to be released...');
setTimeout(() => {
  // Start the server directly
  console.log('\nStarting server...');
  const serverProc = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'inherit',
    shell: true
  });

  serverProc.on('error', (err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
  
  // Wait for server to start up
  console.log('Waiting for server to start...');
  setTimeout(() => {
    // Check if port file exists
    const portFile = path.join(__dirname, 'current-port.txt');
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, 'utf8').trim();
      console.log(`Server is running on port ${port}`);
      
      // Start the client
      console.log('\nStarting client...');
      const clientProc = spawn('npm', ['start'], {
        cwd: path.join(__dirname, 'client'),
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, REACT_APP_SERVER_PORT: port }
      });
      
      clientProc.on('error', (err) => {
        console.error('Failed to start client:', err.message);
      });
      
      console.log('\nBoth server and client should now be running.');
      console.log('Press Ctrl+C to stop the application.');
    } else {
      console.error('Server port file not found. Server may not have started correctly.');
    }
  }, 5000);
}, 2000); 