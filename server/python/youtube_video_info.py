#!/usr/bin/env python3
"""
YouTube Video Info - Gets information about YouTube videos
"""

import sys
import json
import pytube

def get_video_info(video_url):
    """
    Get information about a YouTube video
    
    Args:
        video_url (str): URL of the YouTube video
    
    Returns:
        dict: Dictionary containing video information
    """
    try:
        # Create YouTube object
        yt = pytube.YouTube(video_url)
        
        # Get video information
        video_info = {
            'title': yt.title,
            'author': yt.author,
            'length_seconds': yt.length,
            'publish_date': str(yt.publish_date) if yt.publish_date else None,
            'views': yt.views,
            'thumbnail_url': yt.thumbnail_url,
            'description': yt.description,
            'video_id': yt.video_id
        }
        
        return video_info
    
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python youtube_video_info.py [video_url]", file=sys.stderr)
        sys.exit(1)
    
    video_url = sys.argv[1]
    
    result = get_video_info(video_url)
    
    if result:
        print(json.dumps(result))
        sys.exit(0)
    else:
        sys.exit(1)