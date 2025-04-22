#!/usr/bin/env python3
"""
YouTube Audio Extractor using yt-dlp - More robust extraction from YouTube videos
"""

import sys
import os
import yt_dlp

def download_audio(video_url, output_path):
    """
    Download audio from a YouTube video using yt-dlp
    
    Args:
        video_url (str): URL of the YouTube video
        output_path (str): Path to save the output audio file
    
    Returns:
        bool: Whether the download was successful
    """
    try:
        print(f"Downloading audio from: {video_url}")
        print(f"Output path: {output_path}")
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        # Configure yt-dlp options
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_path,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'verbose': True,
            'progress_hooks': [lambda d: print(f"Progress: {d['status']} - {d.get('_percent_str', 'N/A')} of {d.get('_total_bytes_str', 'N/A')}")],
        }
        
        print("Starting download with yt-dlp...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Get video info before download
            try:
                info = ydl.extract_info(video_url, download=False)
                print(f"Video title: {info.get('title')}")
                print(f"Duration: {info.get('duration')} seconds")
                print(f"Available formats: {len(info.get('formats', []))}")
            except Exception as e:
                print(f"Warning: Could not get video info: {str(e)}")
            
            # Perform the actual download
            print("Downloading audio...")
            ydl.download([video_url])
        
        # Check if file exists
        expected_path = output_path.replace('.mp4', '.mp3')  # yt-dlp adds extension based on postprocessors
        if os.path.exists(expected_path):
            file_size_mb = os.path.getsize(expected_path) / (1024 * 1024)
            print(f"Audio downloaded and saved to {expected_path} ({file_size_mb:.2f} MB)")
            return True
        else:
            print(f"Warning: Expected output file {expected_path} not found.")
            # Try to find any new mp3 files in the output directory
            output_dir = os.path.dirname(os.path.abspath(output_path))
            mp3_files = [f for f in os.listdir(output_dir) if f.endswith('.mp3')]
            if mp3_files:
                print(f"Found these MP3 files in the output directory: {mp3_files}")
                return True
            return False
    
    except Exception as e:
        print(f"Error during download: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python yt_dlp_extractor.py [video_url] [output_path]", file=sys.stderr)
        sys.exit(1)
    
    video_url = sys.argv[1]
    output_path = sys.argv[2]
    
    success = download_audio(video_url, output_path)
    
    if success:
        print("SUCCESS: Audio extracted successfully")
        sys.exit(0)
    else:
        print("FAILED: Could not extract audio")
        sys.exit(1) 