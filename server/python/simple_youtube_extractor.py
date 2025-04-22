#!/usr/bin/env python3
"""
Simple YouTube Audio Extractor - Extracts audio from YouTube videos without pydub
"""

import sys
import os
import pytube

def download_audio(video_url, output_path):
    """
    Download audio from a YouTube video and save it
    
    Args:
        video_url (str): URL of the YouTube video
        output_path (str): Path to save the output audio file
    
    Returns:
        str: Path to the downloaded audio file
    """
    try:
        print(f"Downloading audio from: {video_url}")
        print(f"Output path: {output_path}")
        
        # Create YouTube object
        yt = pytube.YouTube(video_url)
        
        # Print video info
        print(f"Video title: {yt.title}")
        print(f"Author: {yt.author}")
        print(f"Length: {yt.length} seconds")
        
        # Get audio stream (highest quality audio)
        print("Searching for available audio streams...")
        audio_streams = yt.streams.filter(only_audio=True).order_by('abr').desc()
        
        if not audio_streams:
            print("No audio streams found!")
            return None
        
        # Print available audio streams
        print("Available audio streams:")
        for i, stream in enumerate(audio_streams):
            print(f"  {i+1}. {stream.mime_type}, Bitrate: {stream.abr}, Size: {round(stream.filesize / (1024 * 1024), 2)} MB")
        
        # Get the highest quality audio stream
        audio_stream = audio_streams.first()
        print(f"Selected stream: {audio_stream.mime_type}, Bitrate: {audio_stream.abr}")
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Download audio
        print("Downloading audio...")
        downloaded_file = audio_stream.download(
            output_path=os.path.dirname(output_path),
            filename=os.path.basename(output_path)
        )
        
        print(f"Audio downloaded and saved to {downloaded_file}")
        return downloaded_file
    
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python simple_youtube_extractor.py [video_url] [output_path]", file=sys.stderr)
        sys.exit(1)
    
    video_url = sys.argv[1]
    output_path = sys.argv[2]
    
    result = download_audio(video_url, output_path)
    
    if result:
        print(f"SUCCESS: Audio extracted to {result}")
        sys.exit(0)
    else:
        print("FAILED: Could not extract audio")
        sys.exit(1) 