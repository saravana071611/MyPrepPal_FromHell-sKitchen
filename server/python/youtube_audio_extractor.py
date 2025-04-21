#!/usr/bin/env python3
"""
YouTube Audio Extractor - Extracts audio from YouTube videos
"""

import sys
import os
import pytube
from pydub import AudioSegment

def download_audio(video_url, output_path):
    """
    Download audio from a YouTube video and save it as an MP3 file
    
    Args:
        video_url (str): URL of the YouTube video
        output_path (str): Path to save the output MP3 file
    
    Returns:
        str: Path to the downloaded audio file
    """
    try:
        # Create YouTube object
        yt = pytube.YouTube(video_url)
        
        # Get audio stream
        audio_stream = yt.streams.filter(only_audio=True).first()
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Download audio
        temp_file = audio_stream.download(
            output_path=os.path.dirname(output_path),
            filename=os.path.basename(output_path) + ".temp"
        )
        
        # Convert to MP3
        audio = AudioSegment.from_file(temp_file)
        audio.export(output_path, format="mp3")
        
        # Clean up temporary file
        os.remove(temp_file)
        
        print(f"Audio downloaded and saved to {output_path}")
        return output_path
    
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python youtube_audio_extractor.py [video_url] [output_path]", file=sys.stderr)
        sys.exit(1)
    
    video_url = sys.argv[1]
    output_path = sys.argv[2]
    
    result = download_audio(video_url, output_path)
    
    if result:
        sys.exit(0)
    else:
        sys.exit(1)