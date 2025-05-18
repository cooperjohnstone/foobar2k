import os 
import subprocess
import sys

reaper_path = "C:/Program Files/REAPER (x64)/reaper.exe"

def get_current_versions(master_file_dir):
    current_versions = []
    if not os.path.exists(master_file_dir):
        return current_versions
    
    folder_names = os.listdir(master_file_dir)

    for folder_name in folder_names:
        if folder_name.startswith("v"):
            split_folder_name = folder_name.split("v")[-1]

            if len(split_folder_name) > 1:
                version_number = int(split_folder_name)
                current_versions.append(version_number)
    current_versions.sort()
    return current_versions


def open_reaper(file_path, filename, samplerate):

    project_dir = os.path.dirname(file_path)
    master_file_dir = os.path.join(project_dir, "MASTER", "MASTER_file")

    current_versions = get_current_versions(master_file_dir)

    if current_versions:
        max_version = current_versions[-1]
        next_version = max_version+1
        version = "v{0:02d}".format(next_version)
        save_filename = "{0}_MASTER_{1}_{2}.rpp".format(filename, samplerate, version)
        version_dir = os.path.join(master_file_dir, version)
        if not os.path.exists(version_dir):
            os.makedirs(version_dir)

        save_path = os.path.join(version_dir, save_filename)
    else:
        next_version = 1
        version = "v{0:02d}".format(next_version)
        save_filename = "{0}_MASTER_{1}_{2}.rpp".format(filename, samplerate, version)
        version_dir = os.path.join(master_file_dir, version)
        if not os.path.exists(version_dir):
            os.makedirs(version_dir)

        save_path = os.path.join(version_dir, save_filename)

    subprocess.Popen([reaper_path, file_path, "-saveas", save_path])



# file_path = "D:/beats/projects/555/555.wav"
# filename = "555"
# samplerate = "48000"

# master_file_dir = "D:/beats/projects/555/MASTER_file"
# print(get_current_versions(master_file_dir))

file_path = sys.argv[1]
filename = sys.argv[2]
samplerate = sys.argv[3]

open_reaper(file_path, filename, samplerate)

