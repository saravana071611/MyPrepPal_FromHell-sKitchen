# Hell's Kitchen Fitness App

A Gordon Ramsay-inspired fitness and nutrition application with interactive food games, personalized fitness plans from "The Rock", and recipe analysis.

## Features

- **Interactive Food Ninja Game**: Click on healthy foods and avoid unhealthy ones, or face Chef Ramsay's wrath!
- **Personalized Fitness Profile**: Get a custom fitness assessment and macro goals from The Rock
- **Recipe Extractor**: Turn any YouTube cooking video into a meal prep plan with Gordon Ramsay's brutal honesty

## Technologies Used

- **Frontend**: React, React Router, Styled Components, Axios
- **Backend**: Node.js, Express
- **APIs**: OpenAI API (GPT and Whisper), YouTube API
- **Python**: Audio extraction and processing with pytube and pydub

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)
- FFmpeg (for audio processing)

### Installing Dependencies

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd MyPrepPal_FromHell-sKitchen
   ```

2. **Install server dependencies**
   ```
   cd server
   npm install
   ```

3. **Install Python dependencies**
   ```
   cd python
   pip install -r requirements.txt
   ```
   Note: You might need to install FFmpeg separately according to your operating system.

4. **Install client dependencies**
   ```
   cd ../../client
   npm install
   ```

### Setting Up Environment Variables

1. The server requires OpenAI and YouTube API keys. Create a `.env` file in the server directory with the following format:
   ```
   OPENAI_API_KEY=your_openai_api_key
   YOUTUBE_API_KEY=your_youtube_api_key
   PORT=5000
   NODE_ENV=development
   ```

### Running the Application

1. **Start the server**
   ```
   cd server
   npm run dev
   ```

2. **Start the client**
   ```
   cd client
   npm start
   ```

3. The application should be available at `http://localhost:3000`

## License

This project is licensed under the MIT License.

## Acknowledgements

- Gordon Ramsay for the inspiration (and the quotes!)
- OpenAI for the API that powers our AI features
- YouTube API for video processing capabilities
