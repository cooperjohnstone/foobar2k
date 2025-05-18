from PySide2 import QtCore, QtUiTools, QtWidgets, QtGui
import sys
import subprocess
import os


class Yt_Downloader(QtWidgets.QWidget):
    def __init__(self):
        super(Yt_Downloader, self).__init__()

        self.setWindowTitle("Yt Downloader")
        self.setMinimumWidth(500)
        self.output_path = "C:/temp/yt"
        # Keep window on top of houdini
        self.setWindowFlags(self.windowFlags() | QtCore.Qt.WindowStaysOnTopHint)
        self.create_widgets()
        self.create_layouts()
        self.create_connections()

        self.cmds = {
            "Defualt Command": "",
            "Download mp4": ["--format", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]"],
            "Download Audio": [
                "--format", "bestaudio",
                "--extract-audio",
                "--embed-thumbnail",
                "--embed-metadata",
                "--add-metadata",
                "--embed-chapters",
                "--convert-thumbnails", "jpg",
                "--parse-metadata", "title:%(artist)s - %(title)s",
                "--parse-metadata", ":(?P<meta_synopsis>)",
                "--parse-metadata", "channel:%(album)s",
                "--add-metadata",
                "--parse-metadata", "%(track_number,playlist_index|0)s:%(track_number)s",
                "--add-metadata",
                "--parse-metadata", "title:(?s)(?P<meta_album_artist>.+)",
                "--add-metadata",
                "--yes-playlist",
                "--write-playlist-metafiles"
            ]
        }

        self.ytdlp = "C:/yt-dlp/yt-dlp.exe"
        self.ffmpeg = "C:/ffmpeg/bin/ffmpeg.exe"

        # populate
        self.populate_types()

    def create_widgets(self):
        self.cancel_btn = QtWidgets.QPushButton("Cancel")
        self.download_btn = QtWidgets.QPushButton("Download")

        # line edit
        self.youtube_link = QtWidgets.QLineEdit("https://www.youtube.com/shorts/T9tUFI7Fsmw")
        self.youtube_link.setPlaceholderText("Enter YouTube URL")

        self.output_path_edit = QtWidgets.QLineEdit(self.output_path)
        self.browse_btn = QtWidgets.QPushButton("Browse")

        # cb
        self.type_cb = QtWidgets.QComboBox()

    def create_layouts(self):
        button_layout = QtWidgets.QHBoxLayout()
        button_layout.addWidget(self.cancel_btn)
        button_layout.addWidget(self.download_btn)

        output_layout = QtWidgets.QHBoxLayout()
        output_layout.addWidget(self.output_path_edit)
        output_layout.addWidget(self.browse_btn)

        settings_layout = QtWidgets.QVBoxLayout()
        settings_layout.addWidget(self.youtube_link)
        settings_layout.addLayout(output_layout)
        settings_layout.addWidget(self.type_cb)

        main_layout = QtWidgets.QVBoxLayout(self)
        main_layout.addLayout(settings_layout)
        main_layout.addLayout(output_layout)
        main_layout.addLayout(button_layout)

    def create_connections(self):
        self.cancel_btn.clicked.connect(self.close)
        self.download_btn.clicked.connect(self.download)
        self.browse_btn.clicked.connect(self.browse_output_path)

    def browse_output_path(self):
        dir_path = QtWidgets.QFileDialog.getExistingDirectory(
            self, "Select Output Directory", self.output_path)
        if dir_path:
            self.output_path = dir_path
            self.output_path_edit.setText(dir_path)

    def populate_types(self):
        self.type_cb.clear()
        types = self.cmds
        for type in types.keys():
            self.type_cb.addItem(type)

    def get_link(self):
        link = self.youtube_link.text()
        return link

    def download(self):
        ytdlp = self.ytdlp
        ffmpeg = self.ffmpeg
        link = self.get_link()
        type = self.type_cb.currentText()
        output_path = self.output_path_edit.text()

        cmd = [ytdlp]
        cmd.extend(["--ffmpeg-location", ffmpeg])
        cmd.extend(self.cmds[type])
        cmd.extend(["-o", os.path.join(output_path, "%(title)s.%(ext)s")])
        cmd.append(link)


        subprocess.call(cmd)






if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    app.setStyle(QtWidgets.QStyleFactory.create("fusion"))

    dark_palette = QtGui.QPalette()
    dark_palette.setColor(QtGui.QPalette.Window, QtGui.QColor(45, 45, 45))
    dark_palette.setColor(QtGui.QPalette.WindowText, QtGui.QColor(208, 208, 208))
    dark_palette.setColor(QtGui.QPalette.Base, QtGui.QColor(25, 25, 25))
    dark_palette.setColor(QtGui.QPalette.AlternateBase, QtGui.QColor(208, 208, 208))
    dark_palette.setColor(QtGui.QPalette.ToolTipBase, QtGui.QColor(208, 208, 208))
    dark_palette.setColor(QtGui.QPalette.ToolTipText, QtGui.QColor(208, 208, 208))
    dark_palette.setColor(QtGui.QPalette.Text, QtGui.QColor(208, 208, 208))
    dark_palette.setColor(QtGui.QPalette.Button, QtGui.QColor(45, 45, 45))
    dark_palette.setColor(QtGui.QPalette.ButtonText, QtGui.QColor(208, 208, 208))
    dark_palette.setColor(QtGui.QPalette.BrightText, QtCore.Qt.red)
    dark_palette.setColor(QtGui.QPalette.Link, QtGui.QColor(42, 130, 218))
    dark_palette.setColor(QtGui.QPalette.Highlight, QtGui.QColor(42, 130, 218))
    dark_palette.setColor(QtGui.QPalette.HighlightedText, QtCore.Qt.black)

    app.setPalette(dark_palette)
    win = Yt_Downloader()
    win.show()

    app.exec_()