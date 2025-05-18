import os 
import subprocess
import sys

reaper_path = "C:/Program Files/REAPER (x64)/reaper.exe"

file_path = sys.argv[1]

subprocess.Popen([reaper_path, file_path])
