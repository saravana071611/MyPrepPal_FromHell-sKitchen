# How to Fix the Server Crash Issue

The error "EADDRINUSE" indicates that the server port (5000) is already in use by another process. We've made several improvements to fix this issue and make the application more robust.

## What We Fixed

1. **Automatic Port Switching**: The server will now automatically try other ports if the default port (5000) is already in use.
2. **Diagnostic Tools**: We've added tools to help debug and fix connection issues between the client and server.
3. **Improved Error Handling**: The OpenAI integration now has better error messages and debugging information.
4. **Model Downgrade**: Changed from GPT-4 to GPT-3.5-turbo as your API key might not have GPT-4 access.

## How to Fix the Issue

Follow these steps to get your server and client running again:

### Step 1: Kill the Existing Node Processes (if any)

Open a new Command Prompt or PowerShell window and run:

```
taskkill /F /IM node.exe
```

This will stop any running Node.js processes that might be blocking the port.

### Step 2: Start the Server

In the server directory, run:

```
cd server
npm run dev
```

The server will automatically find an available port if 5000 is occupied. Note the port number in the console output.

### Step 3: Update the Client Configuration

In a new terminal window, run the client proxy update script:

```
cd client
node update-proxy.js
```

This will update the client's `package.json` to use the correct server port.

### Step 4: Start the Client

```
cd client
npm start
```

## Additional Information

If you still have issues:

1. Check the server logs for detailed error messages. The improved debugging will help identify the specific problem.
2. Run `node api-info.js` in the server directory to get information about the API setup.
3. Make sure your OpenAI API key is correctly set up in the `.env` file with the format:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

## Model Changes

We've changed the AI model from GPT-4 to GPT-3.5-turbo. This is because:
1. GPT-3.5-turbo is more widely accessible
2. It has a higher token limit
3. It's less likely to hit rate limits
4. It's more cost-effective

The application functionality should remain the same, but if you specifically need GPT-4, you can change back the model in `server/routes/openai.js`. 