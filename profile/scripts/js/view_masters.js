// Vibe coded the fuck out of this
// finds project in folder structure and double clicks to open it. Wavelab and Reaper supported 

// Global variables
var currentPath = "";
var masterInfo = null;
var lastCheckTime = 0;
var checkInterval = 2000; // Check for changes every 2 seconds
var scroll_pos = 0;
var max_scroll = 0;
var visible_height = 0;
var content_height = 0;
var scroll_step = 40; // Pixels to scroll per mouse wheel notch
var isDraggingScrollbar = false;
var scrollbarDragStartY = 0;
var scrollbarDragStartScroll = 0;

// Function to get the current browsing path from foobar2000
function getCurrentPath() {
    try {
        // Try different methods to get the current path
        // Method 1: Try to get active playlist and see if it's a folder view
        var playlistName = plman.GetPlaylistName(plman.ActivePlaylist);
        if (playlistName.startsWith("Folder: ")) {
            var path = playlistName.substring(8);
            if (/^[A-Za-z]:/.test(path)) {
                // Check if we're already inside a MASTER structure and adjust
                if (path.indexOf("\\MASTER\\") > 0) {
                    path = path.substring(0, path.indexOf("\\MASTER\\"));
                }
                // Check if we're inside MASTER_file directly
                else if (path.indexOf("\\MASTER_file\\") > 0) {
                    path = path.substring(0, path.indexOf("\\MASTER_file\\"));
                }
                return path;
            }
        }

        // Method 2: Try to get the path from selected item
        var item = fb.GetFocusItem();
        if (item) {
            var path = fb.TitleFormat("$directory_path(%path%)").EvalWithMetadb(item);
            if (/^[A-Za-z]:/.test(path)) {
                // Check if we're already inside a MASTER structure and adjust
                if (path.indexOf("\\MASTER\\") > 0) {
                    path = path.substring(0, path.indexOf("\\MASTER\\"));
                }
                // Check if we're inside MASTER_file directly
                else if (path.indexOf("\\MASTER_file\\") > 0) {
                    path = path.substring(0, path.indexOf("\\MASTER_file\\"));
                }
                return path;
            }
        }

        // Method 3: Try to get path from active playlist items
        var playlistItems = plman.GetPlaylistItems(plman.ActivePlaylist);
        if (playlistItems && playlistItems.Count > 0) {
            var path = fb.TitleFormat("$directory_path(%path%)").EvalWithMetadb(playlistItems[0]);
            if (/^[A-Za-z]:/.test(path)) {
                // Check if we're already inside a MASTER structure and adjust
                if (path.indexOf("\\MASTER\\") > 0) {
                    path = path.substring(0, path.indexOf("\\MASTER\\"));
                }
                // Check if we're inside MASTER_file directly
                else if (path.indexOf("\\MASTER_file\\") > 0) {
                    path = path.substring(0, path.indexOf("\\MASTER_file\\"));
                }
                return path;
            }
        }

        return null;
    } catch (e) {
        console.log("Error getting current path: " + e.message);
        return null;
    }
}

// Function to check for master files in MASTER/MASTER_file or directly in MASTER_file, supporting both structures
function checkForMasterFiles(path) {
    if (!path) return null;

    try {
        var fsObject = new ActiveXObject("Scripting.FileSystemObject");
        var masterPath = path + "\\MASTER";
        var masterFilePath = masterPath + "\\MASTER_file";
        var rootMasterFilePath = path + "\\MASTER_file";
        var foundMasterFilePath = null;
        
        // Check for structure 1: path/MASTER/MASTER_file/
        if (fsObject.FolderExists(masterPath) && fsObject.FolderExists(masterFilePath)) {
            foundMasterFilePath = masterFilePath;
        } 
        // Check for structure 2: path/MASTER_file/
        else if (fsObject.FolderExists(rootMasterFilePath)) {
            foundMasterFilePath = rootMasterFilePath;
        }
        
        if (!foundMasterFilePath) {
            console.log("No MASTER_file folder found in either location");
            return null;
        }

        // Get the folder object for MASTER_file
        var masterFolder = fsObject.GetFolder(foundMasterFilePath);
        var projectInfo = {
            projectName: path.split('\\').pop(),
            masterPath: fsObject.FolderExists(masterPath) ? masterPath : path,
            masterFilePath: foundMasterFilePath,
            versionFolders: [],
            rootFiles: []  // For files directly in MASTER_file (old structure)
        };
        
        // First, check for version folders (v00, v01, etc.)
        var folders = new Enumerator(masterFolder.SubFolders);
        var hasVersionFolders = false;
        
        for (; !folders.atEnd(); folders.moveNext()) {
            var folder = folders.item();
            var folderName = folder.Name;
            
            // Check if folder name matches the version pattern (v followed by numbers)
            if (/^v\d+$/i.test(folderName)) {
                hasVersionFolders = true;
                var versionInfo = {
                    version: folderName,
                    path: folder.Path,
                    files: []
                };
                
                // Get files in this version folder
                var files = new Enumerator(folder.Files);
                for (; !files.atEnd(); files.moveNext()) {
                    var file = files.item();
                    versionInfo.files.push({
                        name: file.Name,
                        path: file.Path,
                        size: Math.round(file.Size / 1024) + " KB",
                        type: file.Type
                    });
                }
                
                projectInfo.versionFolders.push(versionInfo);
            }
        }
        
        // Sort version folders
        projectInfo.versionFolders.sort(function(a, b) {
            return a.version.localeCompare(b.version);
        });
        
        // Second, check for files directly in MASTER_file (old structure)
        var rootFiles = new Enumerator(masterFolder.Files);
        
        for (; !rootFiles.atEnd(); rootFiles.moveNext()) {
            var file = rootFiles.item();
            
            // Focus on project files (*.RPP for Reaper)
            projectInfo.rootFiles.push({
                name: file.Name,
                path: file.Path,
                size: Math.round(file.Size / 1024) + " KB",
                type: file.Type,
                
                // Try to extract version info from file name
                version: extractVersionFromFilename(file.Name)
            });
        }
        
        // Sort root files by version (if version detected) or by name
        projectInfo.rootFiles.sort(function(a, b) {
            if (a.version && b.version) {
                return a.version.localeCompare(b.version);
            }
            return a.name.localeCompare(b.name);
        });
        
        // Return project info if we found either version folders or root files
        if (projectInfo.versionFolders.length > 0 || projectInfo.rootFiles.length > 0) {
            return projectInfo;
        }
        
        return null;
    } catch (e) {
        console.log("Error checking for master files: " + e.message);
        return null;
    }
}

// Function to try extracting version from filename (e.g., project_MASTER_44100_v01.RPP)
function extractVersionFromFilename(filename) {
    // Look for common version patterns
    var versionMatch = filename.match(/_v(\d+)\.RPP$/i);
    
    if (versionMatch) {
        return "v" + versionMatch[1];
    }
    
    // Try other patterns
    versionMatch = filename.match(/v(\d+)\.RPP$/i);
    if (versionMatch) {
        return "v" + versionMatch[1];
    }
    
    // No version found
    return null;
}

// Function to draw the master project info with scrolling
function drawMasterInfo(gr, info) {
    var width = window.Width;
    var height = window.Height;
    var margin = 10;
    var lineHeight = 20;
    var footerHeight = 0; // No footer in this simplified version
    
    // Background
    gr.FillSolidRect(0, 0, width, height, RGB(30, 30, 30));
    
    // Fonts
    var titleFont = gdi.Font("Segoe UI", 14, 1); // Bold
    var sectionFont = gdi.Font("Segoe UI", 13, 1); // Bold
    var folderFont = gdi.Font("Segoe UI", 12, 1); // Bold
    var fileFont = gdi.Font("Segoe UI", 11);
    var smallFont = gdi.Font("Segoe UI", 10);
    
    // Colors
    var titleColor = RGB(220, 220, 220);
    var sectionColor = RGB(180, 180, 180);
    var folderColor = RGB(120, 200, 255);
    var fileColor = RGB(200, 200, 200);
    var versionColor = RGB(120, 255, 120);
    var infoColor = RGB(150, 150, 150);
    
    // Apply scrolling offset
    var y = margin - scroll_pos;
    
    // First pass - calculate total content height
    var totalContentHeight = calculateContentHeight(info, lineHeight, margin);
    
    // Title (fixed position, not affected by scrolling)
    gr.FillSolidRect(0, 0, width, margin + 30, RGB(30, 30, 30)); // Background for fixed header
    gr.GdiDrawText("Project: " + info.projectName, titleFont, titleColor, margin, margin, width - margin * 2, 30, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
    
    // Start scrollable content below fixed header
    y = margin + 30;
    var scrollStartY = y;
    
    // Display master path (part of scrollable content)
    if (y + lineHeight - scroll_pos >= scrollStartY && y - scroll_pos < height - footerHeight) {
        gr.GdiDrawText("MASTER_file Path: " + info.masterFilePath, smallFont, infoColor, margin, y - scroll_pos, width - margin * 2, lineHeight, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
    }
    y += lineHeight + 10;
    
    // Display version folders if any
    if (info.versionFolders.length > 0) {
        if (y + lineHeight - scroll_pos >= scrollStartY && y - scroll_pos < height - footerHeight) {
            gr.GdiDrawText("Version Folders:", sectionFont, sectionColor, margin, y - scroll_pos, width - margin * 2, lineHeight, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
        }
        y += lineHeight + 5;
        
        for (var i = 0; i < info.versionFolders.length; i++) {
            var versionFolder = info.versionFolders[i];
            
            // Version folder name - only draw if in visible area
            if (y + lineHeight - scroll_pos >= scrollStartY && y - scroll_pos < height - footerHeight) {
                gr.GdiDrawText(versionFolder.version, folderFont, folderColor, margin, y - scroll_pos, width - margin * 2, lineHeight, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
            }
            y += lineHeight;
            
            // Files in this version folder
            if (versionFolder.files.length === 0) {
                if (y + lineHeight - scroll_pos >= scrollStartY && y - scroll_pos < height - footerHeight) {
                    gr.GdiDrawText("No files found in this folder", smallFont, infoColor, margin + 20, y - scroll_pos, width - margin * 2 - 20, lineHeight, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
                }
                y += lineHeight;
            } else {
                for (var j = 0; j < versionFolder.files.length; j++) {
                    var file = versionFolder.files[j];
                    
                    // File name - only draw if in visible area
                    if (y + lineHeight - scroll_pos >= scrollStartY && y - scroll_pos < height - footerHeight) {
                        gr.GdiDrawText(file.name, fileFont, fileColor, margin + 20, y - scroll_pos, width - margin * 2 - 20, lineHeight, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
                    }
                    y += lineHeight;
                    
                    // File info (size and type) - only draw if in visible area
                    if (y + lineHeight - scroll_pos >= scrollStartY && y - scroll_pos < height - footerHeight) {
                        gr.GdiDrawText("Size: " + file.size + " | Type: " + file.type, smallFont, infoColor, margin + 30, y - scroll_pos, width - margin * 2 - 30, lineHeight, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
                    }
                    y += lineHeight + 5;
                }
            }
            
            // Add spacing between version folders
            y += 5;
            
            // Draw a separator line between version folders - only draw if in visible area
            if (y - 2 - scroll_pos >= scrollStartY && y - 2 - scroll_pos < height - footerHeight) {
                gr.DrawLine(margin, y - 2 - scroll_pos, width - margin, y - 2 - scroll_pos, 1, RGB(60, 60, 60));
            }
            
            y += 8;
        }
    }
    
    // Display root files if any (old structure)
    if (info.rootFiles.length > 0) {
        // Add a bigger separator if we displayed version folders above
        if (info.versionFolders.length > 0) {
            y += 5;
            if (y - 5 - scroll_pos >= scrollStartY && y - 5 - scroll_pos < height - footerHeight) {
                gr.DrawLine(margin, y - 5 - scroll_pos, width - margin, y - 5 - scroll_pos, 2, RGB(80, 80, 80));
            }
            y += 15;
        }
        
        if (y + lineHeight - scroll_pos >= scrollStartY && y - scroll_pos < height - footerHeight) {
            gr.GdiDrawText("Files in MASTER_file (Old Structure):", sectionFont, sectionColor, margin, y - scroll_pos, width - margin * 2, lineHeight, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
        }
        y += lineHeight + 5;
        
        for (var i = 0; i < info.rootFiles.length; i++) {
            var file = info.rootFiles[i];
            
            // File name with version if available - only draw if in visible area
            if (y + lineHeight - scroll_pos >= scrollStartY && y - scroll_pos < height - footerHeight) {
                var displayName = file.name;
                if (file.version) {
                    displayName = file.name + " (" + file.version + ")";
                    gr.GdiDrawText(displayName, fileFont, versionColor, margin, y - scroll_pos, width - margin * 2, lineHeight, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
                } else {
                    gr.GdiDrawText(displayName, fileFont, fileColor, margin, y - scroll_pos, width - margin * 2, lineHeight, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
                }
            }
            y += lineHeight;
            
            // File info (size and type) - only draw if in visible area
            if (y + lineHeight - scroll_pos >= scrollStartY && y - scroll_pos < height - footerHeight) {
                gr.GdiDrawText("Size: " + file.size + " | Type: " + file.type, smallFont, infoColor, margin + 20, y - scroll_pos, width - margin * 2 - 20, lineHeight, DT_LEFT | DT_VCENTER | DT_NOPREFIX | DT_SINGLELINE);
            }
            y += lineHeight + 5;
            
            // Add a small separator after each file - only draw if in visible area
            if (i < info.rootFiles.length - 1) {
                if (y - 2 - scroll_pos >= scrollStartY && y - 2 - scroll_pos < height - footerHeight) {
                    gr.DrawLine(margin + 20, y - 2 - scroll_pos, width - margin - 20, y - 2 - scroll_pos, 1, RGB(50, 50, 50));
                }
                y += 5;
            }
        }
    }
    
    // Update scrolling variables
    content_height = totalContentHeight;
    visible_height = height - footerHeight - margin;
    max_scroll = Math.max(0, content_height - visible_height);
    
    // Ensure scroll position is within valid range
    if (scroll_pos < 0) scroll_pos = 0;
    if (scroll_pos > max_scroll) scroll_pos = max_scroll;
    
    // Draw scrollbar if needed
    if (max_scroll > 0) {
        // Draw scrollbar track
        var scrollbarWidth = 8;
        var scrollbarX = width - scrollbarWidth - 2;
        var scrollbarTrackHeight = height - 4;
        var scrollbarHeight = Math.max(30, (visible_height / content_height) * scrollbarTrackHeight);
        var scrollbarY = 2 + (scroll_pos / max_scroll) * (scrollbarTrackHeight - scrollbarHeight);
        
        // Only draw scrollbar if there's enough content to scroll
        if (scrollbarHeight < scrollbarTrackHeight) {
            // Scrollbar track
            gr.FillSolidRect(scrollbarX, 2, scrollbarWidth, scrollbarTrackHeight, RGB(50, 50, 50));
            
            // Scrollbar thumb
            gr.FillSolidRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight, RGB(120, 120, 120));
        }
    }
}

// Function to calculate total content height
function calculateContentHeight(info, lineHeight, margin) {
    var y = margin + 30; // Start after the fixed title
    
    // Master path
    y += lineHeight + 10;
    
    // Version folders section
    if (info.versionFolders.length > 0) {
        y += lineHeight + 5; // Section header
        
        for (var i = 0; i < info.versionFolders.length; i++) {
            var versionFolder = info.versionFolders[i];
            
            y += lineHeight; // Version folder name
            
            if (versionFolder.files.length === 0) {
                y += lineHeight; // "No files" message
            } else {
                for (var j = 0; j < versionFolder.files.length; j++) {
                    y += lineHeight; // File name
                    y += lineHeight + 5; // File info and spacing
                }
            }
            
            y += 5 + 8; // Separator line and spacing
        }
    }
    
    // Root files section (old structure)
    if (info.rootFiles.length > 0) {
        if (info.versionFolders.length > 0) {
            y += 5 + 15; // Bigger separator and spacing
        }
        
        y += lineHeight + 5; // Section header
        
        for (var i = 0; i < info.rootFiles.length; i++) {
            y += lineHeight; // File name
            y += lineHeight + 5; // File info and spacing
            
            if (i < info.rootFiles.length - 1) {
                y += 5; // Separator line and spacing between files
            }
        }
    }
    
    return y;
}

// Helper function for RGB color
function RGB(r, g, b) {
    return (0xff000000 | (r << 16) | (g << 8) | (b));
}

// Panel callbacks
function on_paint(gr) {
    var width = window.Width;
    var height = window.Height;

    // Fill background
    gr.FillSolidRect(0, 0, width, height, RGB(30, 30, 30));

    // Check if we have master info
    if (masterInfo) {
        drawMasterInfo(gr, masterInfo);
    } else {
        // No master info found, show placeholder text
        var font = gdi.Font("Segoe UI", 12);
        var text = "No master files found.";

        if (currentPath) {
            text += "\n\nCurrent folder: " + currentPath;
            
            // Check if MASTER and MASTER_file exist
            try {
                var fsObject = new ActiveXObject("Scripting.FileSystemObject");
                var masterPath = currentPath + "\\MASTER";
                var masterFilePath = masterPath + "\\MASTER_file";
                
                var masterPathExists = fsObject.FolderExists(masterPath);
                var masterFilePathExists = fsObject.FolderExists(masterFilePath);
                var rootMasterFilePathExists = fsObject.FolderExists(path + "\\MASTER_file");

                if (!masterPathExists && !rootMasterFilePathExists) {
                    text += "\n\nNeither MASTER/MASTER_file nor direct MASTER_file folder found in the current path.";
                } else if (masterPathExists && !masterFilePathExists && !rootMasterFilePathExists) {
                    text += "\n\nMASTER folder exists but MASTER_file folder not found in either location.";
                } else {
                    text += "\n\nMASTER_file structure exists but no files or version folders were found.";
                }
            } catch (e) {
                text += "\n\nError checking folders: " + e.message;
            }
        } else {
            text += "\n\nNo folder detected.";
        }

        // Draw text
        gr.GdiDrawText(text, font, RGB(150, 150, 150), 10, 10, width - 20, height - 20, DT_LEFT | DT_WORDBREAK);
    }
}

// Mouse wheel handler for scrolling
function on_mouse_wheel(step) {
    if (masterInfo) {
        // Calculate new scroll position
        var old_scroll = scroll_pos;
        scroll_pos -= step * scroll_step;
        
        // Constrain scrolling
        if (scroll_pos < 0) scroll_pos = 0;
        if (scroll_pos > max_scroll) scroll_pos = max_scroll;
        
        // Only repaint if scroll position changed
        if (old_scroll !== scroll_pos) {
            window.Repaint();
        }
        
        return true; // Indicate we've handled the wheel event
    }
    return false;
}

// Handle scrollbar dragging
function on_mouse_lbtn_down(x, y) {
    if (masterInfo && max_scroll > 0) {
        var width = window.Width;
        var scrollbarWidth = 8;
        var scrollbarX = width - scrollbarWidth - 2;
        var scrollbarTrackHeight = window.Height - 4;
        var scrollbarHeight = Math.max(30, (visible_height / content_height) * scrollbarTrackHeight);
        var scrollbarY = 2 + (scroll_pos / max_scroll) * (scrollbarTrackHeight - scrollbarHeight);
        
        // Check if click is within scrollbar track area
        if (x >= scrollbarX && x <= scrollbarX + scrollbarWidth && 
            y >= 2 && y <= 2 + scrollbarTrackHeight) {
            
            // Check if click is directly on thumb
            if (y >= scrollbarY && y <= scrollbarY + scrollbarHeight) {
                // Start dragging from current position
                isDraggingScrollbar = true;
                scrollbarDragStartY = y;
                scrollbarDragStartScroll = scroll_pos;
                return true;
            } else {
                // Click in track but not on thumb - jump to that position
                var clickPos = (y - 2) / scrollbarTrackHeight;
                var newScroll = clickPos * max_scroll;
                
                // Adjust so the middle of the thumb is at the click position
                newScroll = Math.max(0, Math.min(max_scroll, newScroll - (scrollbarHeight / 2 / scrollbarTrackHeight) * max_scroll));
                
                if (scroll_pos !== newScroll) {
                    scroll_pos = newScroll;
                    window.Repaint();
                }
                return true;
            }
        }
    }
    return false;
}

function on_mouse_lbtn_up(x, y) {
    // End scrollbar dragging if in progress
    if (isDraggingScrollbar) {
        isDraggingScrollbar = false;
        return true;
    }
    return false;
}

function on_mouse_move(x, y) {
    // Handle scrollbar dragging
    if (isDraggingScrollbar && masterInfo && max_scroll > 0) {
        var scrollbarTrackHeight = window.Height - 4;
        var scrollbarHeight = Math.max(30, (visible_height / content_height) * scrollbarTrackHeight);
        var availableTrackHeight = scrollbarTrackHeight - scrollbarHeight;
        
        // Calculate new scroll position based on drag amount
        var dragDelta = y - scrollbarDragStartY;
        var scrollDelta = (dragDelta / availableTrackHeight) * max_scroll;
        var newScroll = scrollbarDragStartScroll + scrollDelta;
        
        // Apply constraints
        if (newScroll < 0) newScroll = 0;
        if (newScroll > max_scroll) newScroll = max_scroll;
        
        // Update scroll position and repaint if changed
        if (scroll_pos !== newScroll) {
            scroll_pos = newScroll;
            window.Repaint();
        }
        
        return true;
    }
    return false;
}

function on_size() {
    // Reset scroll position when window is resized
    //scroll_pos = 0;
    window.Repaint();
}

function on_playback_new_track() {
    checkForChanges();
}

function on_playlist_switch() {
    checkForChanges();
}

function on_playlist_items_added() {
    checkForChanges();
}

function on_playlist_items_removed() {
    checkForChanges();
}

function on_item_focus_change() {
    checkForChanges();
}

// Timer callback to periodically check for changes
function on_timer(id) {
    var now = new Date().getTime();
    if (now - lastCheckTime > checkInterval) {
        checkForChanges();
        lastCheckTime = now;
    }
}

// Function to check for changes in the current path or master info
function checkForChanges() {
    var newPath = getCurrentPath();
    if (newPath !== currentPath) {
        currentPath = newPath;
        updateMasterInfo();
    }
}

// Function to update the master info based on the current path
function updateMasterInfo() {
    masterInfo = checkForMasterFiles(currentPath);
    window.Repaint();
}

// Initialize
function on_script_unload() {
    // Clean up if needed
}

// Start checking for changes
function on_load() {
    checkForChanges();
    window.SetInterval(on_timer, 1000); // Check every second
}

// Define button constants if not available in your environment
var DT_LEFT = 0x00000000;
var DT_CENTER = 0x00000001;
var DT_RIGHT = 0x00000002;
var DT_VCENTER = 0x00000004;
var DT_SINGLELINE = 0x00000020;
var DT_NOPREFIX = 0x00000800;
var DT_WORDBREAK = 0x00000010;

// Start the panel
on_load();

// File extension mappings with their associated applications
var fileAssociations = {
    '.RPP': 'REAPER',   // Reaper project files
    '.RPL': 'REAPER',   // Reaper project template
    '.wav': 'WaveLab',  // Wave files
    '.mp3': 'WaveLab',  // MP3 files
    '.WavPack': 'WaveLab',
    '.WMA': 'WaveLab',
    '.wavlab': 'WaveLab', // WaveLab specific files
    '.montage': 'WaveLab',
    '.mon': 'WaveLab'
    // Add more associations as needed
};

// Function to handle double-click events
function on_mouse_lbtn_dblclk(x, y) {
    if (!masterInfo) return false;
    
    // Check if clicking on a scrollbar area
    var width = window.Width;
    var scrollbarWidth = 8;
    var scrollbarX = width - scrollbarWidth - 2;
    
    if (x >= scrollbarX) return false; // Ignore double-clicks on scrollbar area
    
    // Find which file (if any) was clicked
    var clickedFile = getFileAtPosition(y);
    
    if (clickedFile) {
        console.log("Double-clicked file: " + clickedFile.path);
        // Show a feedback that we're opening the file
        fb.ShowPopupMessage("Opening file: " + clickedFile.name);
        openFile(clickedFile.path);
        return true;
    }
    
    return false;
}

// Function to determine which file was clicked based on coordinates
function getFileAtPosition(y) {
    if (!masterInfo) return null;
    
    var lineHeight = 20;
    var margin = 10;
    var adjustedY = y + scroll_pos; // Adjust for scrolling
    
    // Skip fixed header
    var currentY = margin + 30;
    
    // Skip master path line
    currentY += lineHeight + 10;
    
    // Check for clicks on version folders
    if (masterInfo.versionFolders.length > 0) {
        // Skip "Version Folders:" heading
        currentY += lineHeight + 5;
        
        for (var i = 0; i < masterInfo.versionFolders.length; i++) {
            var versionFolder = masterInfo.versionFolders[i];
            
            // Skip version folder name
            currentY += lineHeight;
            
            // Files in this version folder
            if (versionFolder.files.length === 0) {
                // Skip "No files found" line
                currentY += lineHeight;
            } else {
                for (var j = 0; j < versionFolder.files.length; j++) {
                    var file = versionFolder.files[j];
                    var fileLineTop = currentY;
                    
                    // Check if click is on this file name
                    currentY += lineHeight;
                    if (adjustedY >= fileLineTop && adjustedY < currentY) {
                        return file;
                    }
                    
                    // Skip file info line
                    currentY += lineHeight + 5;
                }
            }
            
            // Skip spacing and separator between version folders
            currentY += 5 + 8;
        }
    }
    
    // Check for clicks on root files
    if (masterInfo.rootFiles.length > 0) {
        // Skip extra spacing if we had version folders
        if (masterInfo.versionFolders.length > 0) {
            currentY += 5 + 15;
        }
        
        // Skip "Files in MASTER_file" heading
        currentY += lineHeight + 5;
        
        for (var i = 0; i < masterInfo.rootFiles.length; i++) {
            var file = masterInfo.rootFiles[i];
            var fileLineTop = currentY;
            
            // Check if click is on this file name
            currentY += lineHeight;
            if (adjustedY >= fileLineTop && adjustedY < currentY) {
                return file;
            }
            
            // Skip file info line and spacing
            currentY += lineHeight + 5;
            
            // Skip separator line if not the last file
            if (i < masterInfo.rootFiles.length - 1) {
                currentY += 5;
            }
        }
    }
    
    return null; // No file found at the given position
}

// Function to open a file with the appropriate application
function openFile(filePath) {
    if (!filePath) return false;
    
    try {
        // Determine which program to use based on file extension
        var fileExt = getFileExtension(filePath).toUpperCase();
        var programName = fileAssociations[fileExt] || null;
        var programPath = null;
        
        if (programName) {
            // Get the path to the appropriate program
            programPath = getApplicationPath(programName);
            
            if (programPath) {
                // Execute the program with the file path as an argument
                runCommand(programPath, '"' + filePath + '"');
                return true;
            }
        }
        
        // If we got here, we couldn't find a specific program or it wasn't installed
        // Use ShellExecute to let Windows open it with the default application
        var shell = new ActiveXObject("Shell.Application");
        shell.ShellExecute(filePath, "", "", "open", 1);
        return true;
    } catch (e) {
        console.log("Error opening file: " + e.message);
        
        // Try WScript.Shell as a fallback
        try {
            var shell = new ActiveXObject("WScript.Shell");
            shell.Run('"' + filePath + '"', 1, false);
            return true;
        } catch (shellError) {
            console.log("Shell error: " + shellError.message);
            return false;
        }
    }
}

// Helper function to get file extension
function getFileExtension(filePath) {
    var lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filePath.substring(lastDotIndex);
}

// Helper function to get application path
function getApplicationPath(appName) {
    try {
        // Common paths to check
        var programPaths = [];
        
        // For REAPER, check registry first, then common paths
        if (appName === 'REAPER') {
            try {
                var shell = new ActiveXObject("WScript.Shell");
                var regPath = shell.RegRead("HKEY_CURRENT_USER\\Software\\REAPER\\InstallPath");
                if (regPath) {
                    programPaths.push(regPath + "\\reaper.exe");
                }
            } catch (e) {
                // Registry key not found, continue with default paths
            }
            
            // Add common REAPER installation paths
            programPaths.push('C:\\Program Files\\REAPER\\reaper.exe');
            programPaths.push('C:\\Program Files (x86)\\REAPER\\reaper.exe');
            programPaths.push('C:\\Program Files\\REAPER (x64)\\reaper.exe');
            programPaths.push('C:\\Program Files\\Cockos\\REAPER\\reaper.exe');
            programPaths.push('C:\\Program Files (x86)\\Cockos\\REAPER\\reaper.exe');
        }
        
        // For WaveLab, check specific paths for different versions
        else if (appName === 'WaveLab') {
            // Add WaveLab versions (Pro 7-12)
            for (var i = 7; i <= 12; i++) {
                programPaths.push('C:\\Program Files\\Steinberg\\WaveLab ' + i + '\\WaveLab' + i + '.exe');
                programPaths.push('C:\\Program Files\\Steinberg\\WaveLab ' + i + '\\WaveLab.exe');
                programPaths.push('C:\\Program Files\\Steinberg\\WaveLab Pro ' + i + '\\WaveLab Pro ' + i + '.exe');
                programPaths.push('C:\\Program Files\\Steinberg\\WaveLab Pro ' + i + '\\WaveLab.exe');
            }
            programPaths.push('C:\\Program Files\\Steinberg\\WaveLab\\WaveLab.exe');
            programPaths.push('C:\\Program Files\\Steinberg\\WaveLab Pro\\WaveLab Pro.exe');
        }
        
        // Check if any of the paths exist
        var fsObject = new ActiveXObject("Scripting.FileSystemObject");
        
        for (var i = 0; i < programPaths.length; i++) {
            if (fsObject.FileExists(programPaths[i])) {
                return programPaths[i];
            }
        }
        
        // If we get here, the application wasn't found in common paths
        return null;
    } catch (e) {
        console.log("Error finding application path: " + e.message);
        return null;
    }
}

// Helper function to execute a command
function runCommand(program, args) {
    try {
        var shell = new ActiveXObject("WScript.Shell");
        var cmd = '"' + program + '" ' + args;
        console.log("Executing: " + cmd);
        shell.Run(cmd, 1, false);
        return true;
    } catch (e) {
        console.log("Error running command: " + e.message);
        return false;
    }
}