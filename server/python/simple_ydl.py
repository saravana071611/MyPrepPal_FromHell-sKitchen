#!/usr/bin/env python3
# Simple YouTube audio extractor using yt-dlp

import sys
import os
import yt_dlp

def extract_audio(url, output_path):
    """Extract audio from a YouTube video"""
    print(f"Extracting audio from: {url}")
    print(f"Output path: {output_path}")
    
    # Configure yt-dlp options
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_path,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }
    
    # Download and extract audio
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    
    # Check if file exists (yt-dlp adds .mp3 extension)
    expected_path = output_path + '.mp3'
    if os.path.exists(expected_path):
        print(f"Success! Audio saved to: {expected_path}")
        return True
    else:
        print(f"Error: Output file not found at {expected_path}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python simple_ydl.py [youtube_url] [output_path]")
        sys.exit(1)
    
    url = sys.argv[1]
    output_path = sys.argv[2]
    
    success = extract_audio(url, output_path)
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)
