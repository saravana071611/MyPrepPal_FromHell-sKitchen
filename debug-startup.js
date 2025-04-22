/**
 * Debug script to identify where the startup process is freezing
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// For timing how long each step takes
const startTime = Date.now();
const logWithTime = (message) => {
  const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[${timeElapsed}s] ${message}`);
};

logWithTime('Starting debug process - SKIPPING TASKKILL');

// Run port-checker directly
try {
  logWithTime('Running port-checker utility...');
  execSync('node server/utils/port-checker.js', { 
    stdio: 'inherit',
    timeout: 10000 // 10 second timeout
  });
  logWithTime('Port-checker completed successfully');
} catch (error) {
  logWithTime(`Error or timeout in port-checker: ${error.message}`);
}

// Try to start the server in a way we can monitor
logWithTime('Starting server process...');
try {
  const serverProc = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'pipe', // Capture output
    shell: true,
    detached: true // Run in a separate process group
  });

  // Set a timeout to detect if server is hanging
  const serverTimeout = setTimeout(() => {
    logWithTime('⚠️ Server startup timed out after 15 seconds');
    moveToNextStep();
  }, 15000);

  serverProc.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`Server output: ${output}`);
    
    // If we see the "Server running" message, clear timeout and move on
    if (output.includes('Server running on port') || output.includes('✅ Server running on port')) {
      logWithTime('✅ Server started successfully!');
      clearTimeout(serverTimeout);
      moveToNextStep();
    }
  });

  serverProc.stderr.on('data', (data) => {
    console.error(`Server error: ${data.toString()}`);
  });

  serverProc.on('close', (code) => {
    logWithTime(`Server process exited with code ${code}`);
    clearTimeout(serverTimeout);
  });

  serverProc.on('error', (err) => {
    logWithTime(`Failed to start server: ${err.message}`);
    clearTimeout(serverTimeout);
    moveToNextStep();
  });
} catch (error) {
  logWithTime(`Error launching server: ${error.message}`);
  moveToNextStep();
}

function moveToNextStep() {
  logWithTime('Moving to client startup phase...');
  
  // Check if port file exists
  try {
    const portFile = path.join(__dirname, 'current-port.txt');
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, 'utf8').trim();
      logWithTime(`Found port file. Server port: ${port}`);
      
      // Try starting the client
      logWithTime('Starting client...');
      try {
        const clientProc = spawn('npm', ['--no-update-notifier', 'start'], {
          cwd: path.join(__dirname, 'client'),
          stdio: 'pipe',
          shell: true,
          detached: true,
          env: { ...process.env, REACT_APP_SERVER_PORT: port }
        });
        
        // Set a timeout for client startup
        const clientTimeout = setTimeout(() => {
          logWithTime('⚠️ Client startup timed out after 30 seconds');
          process.exit(1);
        }, 30000);
        
        clientProc.stdout.on('data', (data) => {
          const output = data.toString();
          console.log(`Client output: ${output}`);
          
          // If we see the webpack compiled successfully message
          if (output.includes('Compiled successfully') || output.includes('webpack compiled')) {
            logWithTime('✅ Client started successfully!');
            clearTimeout(clientTimeout);
            logWithTime('🎉 Startup completed successfully!');
          }
        });
        
        clientProc.stderr.on('data', (data) => {
          console.error(`Client error: ${data.toString()}`);
        });
        
        clientProc.on('close', (code) => {
          logWithTime(`Client process exited with code ${code}`);
          clearTimeout(clientTimeout);
        });
        
        clientProc.on('error', (err) => {
          logWithTime(`Failed to start client: ${err.message}`);
          clearTimeout(clientTimeout);
        });
      } catch (error) {
        logWithTime(`Error launching client: ${error.message}`);
      }
    } else {
      logWithTime('❌ Server port file not found. Server may not have started correctly.');
    }
  } catch (error) {
    logWithTime(`Error checking port file: ${error.message}`);
  }
} 