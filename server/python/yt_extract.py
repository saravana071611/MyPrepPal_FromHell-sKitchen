#!/usr/bin/env python3
"""
Reliable YouTube Audio Extractor - Uses yt-dlp with timeouts and enhanced error handling
(Windows compatible version)
"""

import sys
import os
import time
import threading
import yt_dlp

class TimeoutException(Exception):
    """Exception raised when an operation times out"""
    pass

def extract_audio(url, output_path, timeout=120):
    """
    Extract audio from a YouTube video with timeout protection
    
    Args:
        url (str): YouTube video URL
        output_path (str): Path to save the audio file
        timeout (int): Timeout in seconds
    
    Returns:
        bool: Success status
    """
    print(f"Starting extraction for: {url}")
    print(f"Output path: {output_path}")
    print(f"Timeout set to: {timeout} seconds")
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(os.path.abspath(output_path))
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        print(f"Created output directory: {output_dir}")
    
    # Extraction result container for thread
    result = {"success": False, "error": None}
    
    # Worker function that will run in a separate thread
    def download_worker():
        try:
            # Configure yt-dlp options with minimal verbosity
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_path,
                'quiet': False,
                'no_warnings': False,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                # Simple progress hook
                'progress_hooks': [lambda d: print(f"Progress: {d['status']} {d.get('_percent_str', '')}")],
            }
            
            print("Starting download...")
            # Run the download process
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # First get basic info without downloading
                try:
                    print("Getting video information...")
                    info = ydl.extract_info(url, download=False)
                    print(f"Video title: {info.get('title', 'Unknown')}")
                    print(f"Duration: {info.get('duration', 'Unknown')} seconds")
                except Exception as e:
                    print(f"Warning: Could not get video info: {e}")
                    # Continue with download anyway
                
                # Now perform the actual download
                print("Downloading and extracting audio...")
                start_time = time.time()
                ydl.download([url])
                duration = time.time() - start_time
                print(f"Download completed in {duration:.2f} seconds")
            
            # Check for output file (yt-dlp adds .mp3 extension because of the postprocessor)
            expected_path = f"{output_path}.mp3"
            if os.path.exists(expected_path):
                size_mb = os.path.getsize(expected_path) / (1024 * 1024)
                print(f"Success! Audio saved to: {expected_path} ({size_mb:.2f} MB)")
                result["success"] = True
            else:
                # Try alternative naming pattern
                base_dir = os.path.dirname(output_path)
                files = [f for f in os.listdir(base_dir) if f.endswith('.mp3') and 
                        os.path.exists(os.path.join(base_dir, f)) and
                        os.path.getmtime(os.path.join(base_dir, f)) > start_time]
                
                if files:
                    print(f"Found newly created audio file: {files[0]}")
                    result["success"] = True
                else:
                    print("Error: No output audio file found")
                    result["error"] = "No output file found"
            
        except Exception as e:
            print(f"Error: {str(e)}")
            result["error"] = str(e)
    
    # Create and start worker thread
    worker_thread = threading.Thread(target=download_worker)
    worker_thread.daemon = True  # Allow thread to be terminated when main program exits
    worker_thread.start()
    
    # Wait for worker to complete or timeout
    worker_thread.join(timeout)
    
    # Check if thread is still alive (meaning it timed out)
    if worker_thread.is_alive():
        print(f"Error: Operation timed out after {timeout} seconds")
        # We can't forcibly stop the thread in Python, but it will be terminated when the program exits
        return False
    
    # Return result from worker
    return result["success"]

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python yt_extract.py [youtube_url] [output_path] [timeout_seconds]")
        sys.exit(1)
    
    url = sys.argv[1]
    output_path = sys.argv[2]
    timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 120
    
    success = extract_audio(url, output_path, timeout)
    
    if success:
        print("✓ Extraction completed successfully")
        sys.exit(0)
    else:
        print("✗ Extraction failed")
        sys.exit(1) 