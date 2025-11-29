import sys 
import os
import shutil

def move_to_music(path, dest_path, year, artist, album, type):

    folder_name = "[{}] {} - {}".format(year, artist, album)
    type = type.upper()
    
    # Rename the folder first
    parent_dir = os.path.dirname(path)
    new_path_temp = os.path.join(parent_dir, folder_name)
    os.rename(path, new_path_temp)

    # Now move it to the destination
    final_path = os.path.join(dest_path, artist, type)
    if not os.path.exists(final_path):
        os.makedirs(final_path)
    
    shutil.move(new_path_temp, final_path)

path = sys.argv[1]
# path  = "O:/beats/complete/Earthbound/Incredible Sound Show Stories Vol. 3 (200 Feet Deep In A Purple Idea)"
dest_path = "O:/test/_all_music"


album = sys.argv[2]
artist = sys.argv[3]
year = sys.argv[4]
type = sys.argv[5]


# album = "Aa"
# artist = "aaa"
# type = "flac"
# year = "2100"

move_to_music(path, dest_path, year, artist, album, type)