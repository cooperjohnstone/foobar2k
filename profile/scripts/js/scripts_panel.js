// Multi-Script Panel for foobar2000
// A customizable panel to launch various scripts with consistent styling

// Global variables
var buttons = [];
var font = null;
var lastMouseX = 0;
var lastMouseY = 0;
var scroll_pos = 0;
var max_scroll = 0;
var visible_height = 0;
var content_height = 0;
var scroll_step = 40; // Pixels to scroll per mouse wheel notch
var isDraggingScrollbar = false;
var scrollbarDragStartY = 0;
var scrollbarDragStartScroll = 0;

// Configuration - Add your scripts here
var scripts_path = fb.ProfilePath + "scripts\\python\\";
var python_temp = fb.ProfilePath + "scripts\\temp\\python\\";
var global_python_path = "C:\\Python39\\python.exe"
var scripts = [
    {
        name: "YouTube Downloader",
        description: "Download videos/audio from YouTube",
        script_path: scripts_path + "ytdlp_ui.py",
        python_path: global_python_path,
        working_dir: python_temp,
        color: {
            bg: RGB(60, 80, 120),
            hover: RGB(80, 100, 140),
            border: RGB(100, 120, 160),
            hoverBorder: RGB(120, 140, 180)
        }
    },
];

// Function to run Python script
function runPythonScript(script) {
    try {
        var WshShell = new ActiveXObject("WScript.Shell");
        
        // Set working directory if specified
        if (script.working_dir) {
            WshShell.CurrentDirectory = script.working_dir;
        }

        var pythonPath = script.python_path || "python";
        
        // Run Python with full path to script
        WshShell.Run('"' + pythonPath + '" "' + script.script_path + '"', 1, false);
        console.log("Python script executed: " + script.script_path);
    } catch (e) {
        console.log("Error executing Python script: " + e.message);
        fb.ShowPopupMessage("Error executing script: " + e.message, script.name);
    }
}

// Function to execute a script
function executeScript(script) {
    if (typeof script.script === 'function') {
        // Execute JavaScript function
        script.script();
    } else if (script.script_path && script.script_path.toLowerCase().endsWith('.py')) {
        // Execute Python script
        runPythonScript(script);
    } else {
        fb.ShowPopupMessage("Script type not supported or not specified correctly", "Script Error");
    }
}

// Draw a button with consistent styling
function drawButton(gr, x, y, width, height, text, description, isHover, color) {
    // Draw button background
    if (isHover) {
        gr.FillRoundRect(x, y, width, height, 5, 5, color.hover);
        gr.DrawRoundRect(x, y, width, height, 5, 5, 1, color.hoverBorder);
    } else {
        gr.FillRoundRect(x, y, width, height, 5, 5, color.bg);
        gr.DrawRoundRect(x, y, width, height, 5, 5, 1, color.border);
    }

    // Draw button text
    var buttonFont = gdi.Font("Segoe UI", 12);
    var descFont = gdi.Font("Segoe UI", 10);
    
    // Main text
    gr.GdiDrawText(text, buttonFont, RGB(230, 230, 230), x + 10, y + 5, width - 20, height - 30, DT_LEFT | DT_NOPREFIX | DT_SINGLELINE);
    
    // Description text (if provided)
    if (description) {
        gr.GdiDrawText(description, descFont, RGB(180, 180, 180), x + 10, y + height - 25, width - 20, 20, DT_LEFT | DT_NOPREFIX | DT_SINGLELINE);
    }

    return {x: x, y: y, width: width, height: height};
}

// Draw the panel
function on_paint(gr) {
    var width = window.Width;
    var height = window.Height;
    var margin = 10;
    var buttonHeight = 70; // Taller buttons to accommodate description
    var buttonSpacing = 10;
    var currentY = margin - scroll_pos;
    
    // Background
    gr.FillSolidRect(0, 0, width, height, RGB(30, 30, 30));
    
    // Clear buttons array
    buttons = [];
    
    // Calculate content height
    content_height = (scripts.length * (buttonHeight + buttonSpacing)) + margin;
    visible_height = height;
    max_scroll = Math.max(0, content_height - visible_height);
    
    // Ensure scroll position is within valid range
    if (scroll_pos < 0) scroll_pos = 0;
    if (scroll_pos > max_scroll) scroll_pos = max_scroll;
    
    // Draw script buttons
    for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        
        // Skip if button would be completely above or below visible area
        if (currentY + buttonHeight < 0 || currentY > height) {
            currentY += buttonHeight + buttonSpacing;
            continue;
        }
        
        // Check if this button is being hovered
        var isHover = false;
        if (buttons.length > i && buttons[i].isHover) {
            isHover = true;
        }
        
        // Draw the button
        var coords = drawButton(
            gr, 
            margin, 
            currentY, 
            width - margin * 2, 
            buttonHeight, 
            script.name, 
            script.description, 
            isHover, 
            script.color || {
                bg: RGB(60, 80, 120),
                hover: RGB(80, 100, 140),
                border: RGB(100, 120, 160),
                hoverBorder: RGB(120, 140, 180)
            }
        );
        
        // Store button coordinates
        buttons.push({
            coords: coords,
            script: script,
            isHover: isHover
        });
        
        // Move to next button position
        currentY += buttonHeight + buttonSpacing;
    }
    
    // Draw scrollbar if needed
    if (max_scroll > 0) {
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

// Helper function for RGB color
function RGB(r, g, b) {
    return (0xff000000 | (r << 16) | (g << 8) | (b));
}

// Mouse wheel handler
function on_mouse_wheel(step) {
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

// Mouse move handler
function on_mouse_move(x, y) {
    // Track mouse position
    lastMouseX = x;
    lastMouseY = y;
    
    // Handle scrollbar dragging
    if (isDraggingScrollbar && max_scroll > 0) {
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
        
        return;
    }
    
    // Check for hover states on buttons
    var needRepaint = false;
    
    for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];
        var coords = button.coords;
        
        // Check if mouse is over button
        var isHover = (x >= coords.x && x <= coords.x + coords.width && 
                       y >= coords.y && y <= coords.y + coords.height);
        
        // Update hover state if changed
        if (button.isHover !== isHover) {
            button.isHover = isHover;
            needRepaint = true;
        }
    }
    
    if (needRepaint) {
        window.Repaint();
    }
}

// Mouse left button down handler
function on_mouse_lbtn_down(x, y) {
    // Check if clicking on scrollbar
    if (max_scroll > 0) {
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
}

// Mouse left button up handler
function on_mouse_lbtn_up(x, y) {
    // Check if we were dragging the scrollbar
    if (isDraggingScrollbar) {
        isDraggingScrollbar = false;
        return true;
    }
    
    // Check if a button was clicked
    for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];
        var coords = button.coords;
        
        if (x >= coords.x && x <= coords.x + coords.width && 
            y >= coords.y && y <= coords.y + coords.height) {
            
            // Execute the script
            executeScript(button.script);
            return true;
        }
    }
}

// Handle window size changes
function on_size() {
    window.Repaint();
}

// Handle notifications from other panels
function on_notify_data(name, info) {
    if (name === "add_script") {
        // Add a new script to the panel
        scripts.push(info);
        window.Repaint();
    }
}

// Define button constants if not available in your environment
var DT_LEFT = 0x00000000;
var DT_CENTER = 0x00000001;
var DT_RIGHT = 0x00000002;
var DT_VCENTER = 0x00000004;
var DT_SINGLELINE = 0x00000020;
var DT_NOPREFIX = 0x00000800;
var DT_WORDBREAK = 0x00000010;

// Register panel
window.DefinePanel("Multi-Script Panel", { author: "Claude" });