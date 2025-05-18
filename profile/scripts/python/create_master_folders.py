import os
import sys

def create_directory_structure(base_path, structure):
    """helper function to create a directory structure"""
    if not os.path.exists(base_path):
        os.makedirs(base_path)

    for name, content in structure.items():
        path = os.path.join(base_path, name)

        # Create directory if it doesn't exist
        if not os.path.exists(path):
            os.makedirs(path)

        # If content is a dictionary, recursively create its structure
        if isinstance(content, dict):
            create_directory_structure(path, content)
        # If content is a list, create empty directories for each item
        elif isinstance(content, list):
            for item in content:
                item_path = os.path.join(path, item)
                if not os.path.exists(item_path):
                    os.makedirs(item_path)

    return True


structure = {
    "MASTER": {
        "cover": {
            "v00": []
        },
        "MASTER_file": {
            "v00": []
        },
        "MASTER_tracks": {
            "v00": []
        },
        "MASTERS": [] 
    }
}

base_path = sys.argv[1]
create_directory_structure(base_path, structure)