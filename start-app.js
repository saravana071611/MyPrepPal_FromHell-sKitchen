const { execSync, spawn } = require('child_process');
const path = require('path');
const os = require('os');

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

// Function to start the client
function startClient() {
  console.log('\n🖥️ Starting client...');
  
  // Allow some time for the server to initialize
  setTimeout(() => {
    const clientProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'client'),
      stdio: 'inherit',
      shell: true
    });
    
    clientProcess.on('error', (error) => {
      console.error('   ❌ Failed to start client:', error.message);
    });
  }, 2000);
}

// Set up cleanup handler
function setupCleanup(serverProcess) {
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    
    // Attempt to kill the server process
    if (serverProcess) {
      console.log('   Terminating server process...');
      if (os.platform() === 'win32') {
        // On Windows, we need a different approach since child process signals work differently
        execSync('taskkill /F /IM node.exe', { stdio: 'inherit' });
      } else {
        serverProcess.kill('SIGTERM');
      }
    }
    
    console.log('   ✅ Cleanup complete. Exiting.');
    process.exit(0);
  });
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
  
  // Start client after a short delay
  setTimeout(startClient, 3000);
  
  // Setup cleanup handlers
  setupCleanup(serverProcess);
  
  console.log('\n✨ Application startup sequence complete!');
  console.log('   Press Ctrl+C to stop all processes and exit.');
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error during startup:', error);
  process.exit(1);
}); 