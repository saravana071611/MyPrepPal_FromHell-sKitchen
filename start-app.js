const { execSync, spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

console.log('=========================================');
console.log('  Starting MyPrepPal from Hell\'s Kitchen');
console.log('=========================================');

// Function to clear Node.js processes
function clearPorts() {
  console.log('\n🧹 Clearing ports by terminating Node.js processes...');
  
  try {
    if (os.platform() === 'win32') {
      try {
        // Get a list of Node.js processes
        const processListOutput = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV').toString();
        
        // Parse the CSV output
        const lines = processListOutput.split('\n').filter(line => line.trim().length > 0);
        
        // Skip the header line
        if (lines.length > 1) {
          console.log(`   Found ${lines.length - 1} Node.js processes running.`);
          
          // Kill each Node.js process
          execSync('taskkill /F /IM node.exe', { stdio: 'inherit' });
          console.log('   ✅ All Node.js processes terminated.');
        } else {
          console.log('   ✅ No Node.js processes found running.');
        }
      } catch (e) {
        if (e.message.includes('not found')) {
          console.log('   ✅ No Node.js processes found running.');
        } else {
          throw e;
        }
      }
    } else {
      // For Unix-like systems (Linux, macOS)
      execSync('pkill -f node || true', { stdio: 'inherit' });
      console.log('   ✅ Cleared all Node.js processes (if any were running).');
    }
  } catch (error) {
    console.error('   ❌ Error while clearing ports:', error.message);
    // Don't exit with error code as this shouldn't prevent server from starting
  }
  
  // Run our port finder utility to detect and reserve a free port
  console.log('\n🔍 Finding an available port...');
  try {
    execSync('node ./server/utils/port-checker.js', { stdio: 'inherit' });
    console.log('   ✅ Free port found and reserved.');
  } catch (error) {
    console.error('   ❌ Error finding free port:', error.message);
  }
}

// Function to start the server
function startServer() {
  console.log('\n🚀 Starting server...');
  
  const serverProcess = spawn('node', ['server.js'], { 
    cwd: path.join(__dirname, 'server'),
    stdio: 'inherit',
    shell: true
  });
  
  serverProcess.on('error', (error) => {
    console.error('   ❌ Failed to start server:', error.message);
  });
  
  // Return process for cleanup
  return serverProcess;
}

// Function to wait for the server to be ready
async function waitForServer() {
  console.log('\n⏱️ Waiting for server to be ready...');
  
  // Poll for the current-port.txt file
  return new Promise((resolve) => {
    const checkFile = () => {
      const portFilePath = path.join(__dirname, 'current-port.txt');
      if (fs.existsSync(portFilePath)) {
        try {
          const port = fs.readFileSync(portFilePath, 'utf8').trim();
          console.log(`   ✅ Server is ready on port ${port}`);
          return resolve(port);
        } catch (err) {
          console.log('   ⏳ Port file exists but couldn\'t be read. Retrying...');
        }
      }
      
      console.log('   ⏳ Waiting for server to write port file...');
      setTimeout(checkFile, 1000);
    };
    
    checkFile();
  });
}

// Function to start the client
function startClient(port) {
  console.log('\n🖥️ Starting client...');
  
  // Set the environment variable for the server port
  const env = { ...process.env, REACT_APP_SERVER_PORT: port };
  
  const clientProcess = spawn('npm', ['start'], {
    cwd: path.join(__dirname, 'client'),
    stdio: 'inherit',
    shell: true,
    env
  });
  
  clientProcess.on('error', (error) => {
    console.error('   ❌ Failed to start client:', error.message);
  });
  
  return clientProcess;
}

// Main function
async function main() {
  // Clear ports first
  clearPorts();
  
  // Give some time for ports to be fully released
  console.log('\n⏱️ Waiting for ports to be fully released...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start server
  const serverProcess = startServer();
  
  // Wait for server to be ready and get the port
  const port = await waitForServer();
  
  // Start client with the correct port
  const clientProcess = startClient(port);
  
  // Setup cleanup handlers
  setupCleanup(serverProcess, clientProcess);
  
  console.log('\n✨ Application startup sequence complete!');
  console.log('   Press Ctrl+C to stop all processes and exit.');
}

// Set up cleanup handler for both server and client
function setupCleanup(serverProcess, clientProcess) {
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    
    // Attempt to kill the processes
    if (serverProcess || clientProcess) {
      console.log('   Terminating processes...');
      if (os.platform() === 'win32') {
        // On Windows, we need a different approach since child process signals work differently
        execSync('taskkill /F /IM node.exe', { stdio: 'inherit' });
      } else {
        if (serverProcess) serverProcess.kill('SIGTERM');
        if (clientProcess) clientProcess.kill('SIGTERM');
      }
    }
    
    console.log('   ✅ Cleanup complete. Exiting.');
    process.exit(0);
  });
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error during startup:', error);
  process.exit(1);
}); 