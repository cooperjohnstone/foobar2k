import os 
import subprocess
import sys

reaper_path = "C:/Program Files/Steinberg/WaveLab Pro 11/WaveLabPro11.exe"

file_path = sys.argv[1]

subprocess.Popen([reaper_path, file_path])
