/**
 * Reset port configuration for the server
 * This script sets the server port back to 5001
 */

const fs = require('fs');
const path = require('path');

// Port to reset to
const PORT = 5001;

// Paths for port configuration files
const portFilePath = path.join(__dirname, 'data', 'port.txt');
const rootPortFilePath = path.join(__dirname, '..', 'current-port.txt');

// Function to reset the port
async function resetPort() {
  console.log(`Resetting server port to ${PORT}...`);
  
  try {
    // Ensure the data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Created data directory');
    }
    
    // Write the port to the server port file
    fs.writeFileSync(portFilePath, PORT.toString(), 'utf8');
    console.log(`Server port file updated: ${portFilePath}`);
    
    // Write the port to the root project port file
    fs.writeFileSync(rootPortFilePath, PORT.toString(), 'utf8');
    console.log(`Root port file updated: ${rootPortFilePath}`);
    
    console.log(`\nServer port has been reset to ${PORT}.`);
    console.log('Next time you start the server, it will use port 5001.');
  } catch (error) {
    console.error('Error resetting port:', error.message);
  }
}

// Run the reset function
resetPort(); 