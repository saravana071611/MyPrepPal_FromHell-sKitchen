/**
 * API INFO HELPER SCRIPT
 * 
 * This script provides information about the running API server.
 * If the server had to use a different port than the default, this will show you
 * how to configure the client to connect to the correct port.
 */

const fs = require('fs');
const path = require('path');

// Try to find the correct port from server logs
const findServerPort = () => {
  try {
    // Check if there's a port.txt file (created by server.js)
    const portFilePath = path.join(__dirname, 'data', 'port.txt');
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

const port = findServerPort();

console.log(`
=====================================================
🔧 HELL'S KITCHEN API SERVER INFORMATION 🔧
=====================================================

API server is running on port: ${port}

If this is not the default port (5000), you need to update
your client configuration to use this port.

For the React client, create a .env file in the client directory with:

REACT_APP_API_URL=http://localhost:${port}

Then restart your React client app.

For manual testing, use these endpoints:
- API Status: http://localhost:${port}/api/status
- User Profiles: http://localhost:${port}/api/user/profile
- OpenAI Fitness Assessment: http://localhost:${port}/api/openai/fitness-assessment
- YouTube Video Info: http://localhost:${port}/api/youtube/video-info

=====================================================
`);

// Exit after displaying the info
process.exit(0); 