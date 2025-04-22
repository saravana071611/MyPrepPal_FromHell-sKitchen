/**
 * CLIENT PROXY UPDATE SCRIPT
 * 
 * This script updates the client's proxy configuration in package.json
 * to match the current server port.
 */

const fs = require('fs');
const path = require('path');

// Function to find the server port
const findServerPort = () => {
  try {
    // Check if there's a port.txt file in the server's data directory
    const portFilePath = path.join(__dirname, '..', 'server', 'data', 'port.txt');
    if (fs.existsSync(portFilePath)) {
      const port = fs.readFileSync(portFilePath, 'utf8').trim();
      return port;
    }
  } catch (error) {
    console.error('Error reading port file:', error.message);
  }
  
  // Default port if we can't find it
  return '5000';
};

// Function to update the proxy in package.json
const updateProxy = (port) => {
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const currentProxy = packageJson.proxy || 'not set';
    const newProxy = `http://localhost:${port}`;
    
    if (currentProxy === newProxy) {
      console.log(`\nProxy is already set to ${newProxy}\n`);
      return false;
    }
    
    // Update the proxy
    packageJson.proxy = newProxy;
    
    // Write the updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    console.log(`\nUpdated proxy from ${currentProxy} to ${newProxy}\n`);
    return true;
  } catch (error) {
    console.error('Error updating package.json:', error.message);
    return false;
  }
};

// Main function
const main = () => {
  console.log('\n=== CLIENT PROXY UPDATE ===\n');
  
  const port = findServerPort();
  console.log(`Found server port: ${port}`);
  
  const updated = updateProxy(port);
  
  if (updated) {
    console.log('\n⚠️ IMPORTANT: You need to restart your client app for the changes to take effect.');
    console.log('   Run: npm start\n');
  }
  
  console.log('=========================\n');
};

// Run the main function
main(); 