#!/usr/bin/env python3
"""
Simple YouTube Audio Extractor - Extracts audio from YouTube videos without pydub
"""

import sys
import os
import pytube
import time

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
        
        # Create YouTube object with additional options
        print("Creating YouTube object...")
        
        # Add additional options to bypass restrictions
        yt = pytube.YouTube(
            video_url,
            use_oauth=False,
            allow_oauth_cache=True
        )
        
        # Wait a bit to initialize connection (helps with some issues)
        time.sleep(1)
        
        # Try to get video info
        try:
            print(f"Video title: {yt.title}")
            print(f"Author: {yt.author}")
            print(f"Length: {yt.length} seconds")
        except Exception as e:
            print(f"Warning: Could not get video info: {str(e)}")
            # Continue anyway as we might still be able to download
        
        # Get audio stream (highest quality audio)
        print("Searching for available audio streams...")
        try:
            audio_streams = yt.streams.filter(only_audio=True).order_by('abr').desc()
            
            if not audio_streams or len(audio_streams) == 0:
                print("No audio streams found, trying with progressive streams...")
                audio_streams = yt.streams.filter(progressive=True).order_by('abr').desc()
            
            if not audio_streams or len(audio_streams) == 0:
                print("No streams found at all, trying with any format...")
                audio_streams = yt.streams.order_by('abr').desc()
        except Exception as e:
            print(f"Error getting streams: {str(e)}")
            return None
        
        if not audio_streams or len(audio_streams) == 0:
            print("No audio streams found!")
            return None
        
        # Print available audio streams
        print("Available audio streams:")
        for i, stream in enumerate(audio_streams[:5]):  # Only print first 5 to avoid clutter
            print(f"  {i+1}. {stream.mime_type}, Bitrate: {stream.abr}, Size: {stream.filesize_approx / (1024 * 1024):.2f} MB")
        
        # Get the highest quality audio stream
        audio_stream = audio_streams.first()
        print(f"Selected stream: {audio_stream.mime_type}, Bitrate: {audio_stream.abr}")
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        # Download audio
        print("Downloading audio...")
        downloaded_file = audio_stream.download(
            output_path=os.path.dirname(os.path.abspath(output_path)),
            filename=os.path.basename(output_path)
        )
        
        # Verify file exists and has content
        if os.path.exists(downloaded_file):
            file_size_mb = os.path.getsize(downloaded_file) / (1024 * 1024)
            print(f"Audio downloaded and saved to {downloaded_file} ({file_size_mb:.2f} MB)")
            
            if file_size_mb < 0.1:
                print("Warning: Downloaded file is very small, might be incomplete.")
                
            return downloaded_file
        else:
            print("Error: Downloaded file doesn't exist")
            return None
    
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