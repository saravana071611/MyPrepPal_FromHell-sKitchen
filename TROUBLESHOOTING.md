# MyPrepPal - Troubleshooting Guide

This guide will help you diagnose and fix common issues with the MyPrepPal application.

## ECONNRESET Errors

If you're experiencing `ECONNRESET` errors (connection reset by peer) when using the application, try the following solutions:

### Solution 1: Use the Enhanced Start Script

We've created an enhanced startup script that configures longer timeouts and better error handling:

```bash
enhanced-start.bat
```

This script:
- Terminates any existing Node.js processes
- Sets up proper environment variables
- Configures longer timeouts for API calls
- Ensures all required directories exist
- Starts both server and client with optimized settings

### Solution 2: Run the Connection Test

We've created a utility to test the connection between the client and server:

```bash
node test-connection.js
```

This will help diagnose any network issues between the client and server components.

### Solution 3: Check for Firewall or Antivirus Interference

Security software can sometimes block connections between the client and server:
1. Temporarily disable your firewall/antivirus to test if it's causing the issue
2. Add exceptions for Node.js and the application ports (typically 3000 and 5000)

### Solution 4: Increase Timeouts

The application now uses increased timeouts with retry logic for handling longer requests. If you're still experiencing issues with large videos or complex recipes:

1. Try using shorter videos (under 10 minutes)
2. Ensure your OpenAI API key has sufficient quota
3. Check that your internet connection is stable

### Solution 5: Check Server Logs

If the issues persist, check the server console window for detailed error messages that may provide more insight into the problem.

## General Performance Tips

1. **Use shorter videos**: The recipe extraction works best with videos under 10-15 minutes.

2. **Ensure OpenAI API key is valid**: Check that your API key is correctly set in the server/.env file.

3. **Close other applications**: Ensure you have sufficient system resources available.

4. **Restart the application**: Sometimes a fresh start resolves connection issues.

## Still Having Issues?

If you continue to experience problems after trying these solutions:

1. Stop the application using `stop-app.bat`
2. Delete any temporary files in the `server/data/temp` directory
3. Restart your computer
4. Start the application using `enhanced-start.bat`

If problems persist, please report the issue with details about your system configuration and the specific error messages you're seeing. 