const net = require('net');
const fs = require('fs');
const path = require('path');

/**
 * Check if a port is in use
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} - True if port is free, false if in use
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port is in use
      } else {
        resolve(true); // Some other error, assume port is free
      }
    });
    
    server.once('listening', () => {
      // Close the server and return true (port is free)
      server.close(() => {
        resolve(true);
      });
    });
    
    server.listen(port);
  });
}

/**
 * Find a free port starting from the specified port
 * @param {number} startPort - The port to start checking from
 * @param {number} maxAttempts - Maximum number of ports to check
 * @returns {Promise<number>} - A free port number
 */
async function findFreePort(startPort = 5000, maxAttempts = 10) {
  console.log(`Looking for a free port starting from ${startPort}...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const isFree = await isPortFree(port);
    
    if (isFree) {
      console.log(`Found free port: ${port}`);
      return port;
    }
    
    console.log(`Port ${port} is in use, trying next port...`);
  }
  
  // If we've tried all ports in the range, generate a random port
  const randomPort = Math.floor(Math.random() * 1000) + 8000;
  console.log(`Could not find a free port in the specified range. Using random port ${randomPort}`);
  return randomPort;
}

/**
 * Save the port to a file
 * @param {number} port - The port number to save
 */
function savePortToFile(port) {
  try {
    // Save to server/data directory
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const serverPortFilePath = path.join(dataDir, 'port.txt');
    fs.writeFileSync(serverPortFilePath, port.toString());
    console.log(`Port ${port} saved to server data: ${serverPortFilePath}`);
    
    // Also save to project root for easier access
    const rootPortFilePath = path.join(__dirname, '..', '..', 'current-port.txt');
    fs.writeFileSync(rootPortFilePath, port.toString());
    console.log(`Port ${port} saved to project root: ${rootPortFilePath}`);
    
    console.log(`PORT ${port} IS READY FOR USE`);
  } catch (error) {
    console.error('Failed to save port to file:', error.message);
    throw error; // Rethrow to notify calling code
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  (async () => {
    try {
      console.log('Starting port finder utility...');
      const port = await findFreePort();
      console.log(`Found free port: ${port}`);
      savePortToFile(port);
      console.log('Port finder utility completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error in port finder utility:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  isPortFree,
  findFreePort,
  savePortToFile
}; 