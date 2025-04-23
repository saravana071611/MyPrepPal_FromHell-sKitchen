require('dotenv').config();
const { OpenAI } = require('openai');

// Check if key exists and has a valid format
const apiKey = process.env.OPENAI_API_KEY;
console.log('API Key exists:', !!apiKey);
console.log('API Key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'Not found');
console.log('API Key length:', apiKey ? apiKey.length : 'N/A');
console.log('API Key contains newlines:', apiKey ? apiKey.includes('\n') : 'N/A');
console.log('API Key contains spaces:', apiKey ? apiKey.includes(' ') : 'N/A');
console.log('API Key format valid for sk-:', /^sk-[a-zA-Z0-9]{48,}/.test(apiKey));
console.log('API Key format valid for sk-proj-:', /^sk-proj-[a-zA-Z0-9_]{20,}/.test(apiKey));

// Show the full key with special char indicators
if (apiKey) {
  const sanitizedKey = apiKey
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\s/g, '·'); // Replace spaces with visible character
  console.log('Full API Key:', sanitizedKey);
}

// Try to use the API
async function testApiConnection() {
  try {
    console.log('Attempting to connect to OpenAI API...');
    const openai = new OpenAI({
      apiKey: apiKey
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello, this is a test message." }],
      max_tokens: 10
    });
    
    console.log('Connection successful!');
    console.log('Response:', response.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('API Connection Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return false;
  }
}

testApiConnection(); 