import os
import subprocess
import re
import sys


ffmpeg = "ffmpeg.exe"

def create_video(album_dir, album_name, cover_dir):

    audio = os.path.join(album_dir, album_name + ".wav")
    cue = os.path.join(album_dir, album_name + ".cue")

    output_video = os.path.join(album_dir, album_name + ".mov")

    ffmpeg_cmd = [
        ffmpeg,
        "-loop", "1",           # Loop the image
        "-i", cover_dir,        # Input image file
        "-i", audio,            # Input audio file
        "-c:v", "libx264",      # Video codec
        "-tune", "stillimage",  # Optimize for still image
        "-r", "24",
        "-c:a", "pcm_s24le",    # Linear PCM 24-bit (now compatible with MOV container)
        "-ar", "48000",         # 48kHz sample rate
        "-pix_fmt", "yuv420p",  # Pixel format for compatibility
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",  # Scale and center the image
        "-shortest",            # End when audio ends
        output_video            # Output file
    ]

    subprocess.call(ffmpeg_cmd)

    create_description(album_dir, album_name)

def create_description(album_dir, album_name):

    cue = os.path.join(album_dir, album_name + ".cue")

    with open(cue, 'r') as f:
        cue_content = f.read()

    album_title_match = re.search(r'TITLE\s+"([^"]+)"', cue_content)
    album_title = album_title_match.group(1) if album_title_match else "Unknown"

    # Extract main performer
    performer_match = re.search(r'PERFORMER\s+"([^"]+)"', cue_content)
    performer = performer_match.group(1) if performer_match else "Unknown"

    track_blocks = re.finditer(r'TRACK (\d+) (.*?)(?=TRACK|\Z)', cue_content, re.DOTALL)

    track_title = []

    for track_match in track_blocks:
        track_content = track_match.group(0)

        track_title_match = re.search(r'TITLE "(.*?)"', track_content)
        title = track_title_match.group(1)

        track_index_match = re.search(r'INDEX (\d+) ([\d:]+)', track_content)
        timestamp = track_index_match.group(2)
        timestamp_split = timestamp.split(":")
        min = int(timestamp_split[0])
        sec = timestamp_split[1]
        time = str(min) + ":" + sec

        title_string  = "{0}-{1}".format(time, title)
        track_title.append(title_string)

    description = ""
    description += "{0} - {1}\n".format(performer, album_title)
    description += "\n".join(track_title)
    description_path = os.path.join(album_dir, album_name + "_description.txt")

    with open(description_path, 'w') as f:
        f.write(description)


album_dir = sys.argv[1]
album_name = sys.argv[2]
parent_of_album_dir = os.path.dirname(album_dir)
project_dir_ospath = os.path.dirname(parent_of_album_dir)
cover_dir = os.path.join(project_dir_ospath, "cover", "cover.png")

create_video(album_dir, album_name, cover_dir)

