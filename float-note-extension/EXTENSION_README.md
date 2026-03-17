# Float Note Extension

A translucent, floating note-taking editor browser extension that saves notes associated with the current page's URL. Resume your notes anytime you visit the same page.

## Features

### 🎯 Core Functionality
- **Floating Editor** - A beautiful, translucent note editor that floats on top of any webpage
- **URL-Based Storage** - Notes are automatically saved and keyed by page URL + timestamp
- **Per-Tab Resumption** - Open the same URL in a new tab and resume your previous note
- **Auto-Save** - Notes auto-save every 2 seconds as you type
- **Manual Save** - Click the Save button for immediate persistence
- **Draggable Interface** - Move the editor around the page by dragging the header

### 💾 Storage System
- **Key Format**: `{URL}|{timestamp}`
- **Storage Backend**: Chrome's `chrome.storage.local` API
- **Per-Tab Isolation**: Each tab maintains its own editor state
- **Multiple Notes**: View all notes created for a page in the extension popup

### 🎨 Design
- **Glassmorphism UI** - Translucent editor with blur effects
- **Smooth Animations** - Slide-in animations and hover effects
- **Responsive Layout** - Works on any screen size
- **Dark/Light Compatible** - Adapts to page backgrounds

## Installation

### For Development (Chrome/Chromium)

1. **Extract the extension files** to a directory on your computer
2. **Open Chrome Extensions Page**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
3. **Load the extension**:
   - Click "Load unpacked"
   - Select the extension directory
4. **Verify Installation**:
   - The extension icon should appear in your toolbar
   - Click it to see the popup interface

### For Production (Chrome Web Store)
Submit the extension to the Chrome Web Store following Google's submission guidelines.

## File Structure

```
floating-note-extension/
├── public/
│   ├── manifest.json          # Extension configuration
│   ├── background.js          # Service worker (tab state, storage)
│   ├── content.js             # Content script (injects editor)
│   ├── popup.html             # Extension popup UI
│   ├── popup.js               # Popup functionality
│   └── icons/                 # Extension icons
│       ├── icon-16.png        # Toolbar icon
│       ├── icon-48.png        # Menu icon
│       └── icon-128.png       # Store listing icon
└── EXTENSION_README.md        # This file
```

## How It Works

### 1. **Extension Initialization**
When you click the extension icon on any page:
- The background service worker initializes the tab
- It checks if there are existing notes for the current URL
- If notes exist, the most recent one is loaded

### 2. **Editor Activation**
- Click "Open Editor" in the popup to show the floating editor
- The editor appears with any previously saved content
- You can immediately start typing

### 3. **Note Saving**
- **Auto-Save**: Changes are saved automatically after 2 seconds of inactivity
- **Manual Save**: Click the Save button for immediate persistence
- Status indicator shows "Unsaved changes..." or "Saved"

### 4. **Note Management**
In the extension popup, you can:
- View all notes created for the current page
- Click a note to resume editing it
- Delete individual notes
- Clear all notes for the page

### 5. **Per-Tab Resumption**
- Close the editor and navigate away
- Return to the same URL in any tab
- Click the extension icon and your note is ready to resume

## Storage Details

### Key Format
Each note is stored with a unique key combining the page URL and creation timestamp:
```
https://example.com/page|1708686000000
```

### Storage Limits
- Chrome allows up to 10MB of storage per extension
- Timestamps prevent key collisions when creating multiple notes on the same page
- Old notes are never automatically deleted (manual deletion required)

### Data Persistence
- Notes persist across browser sessions
- Clearing browser cache does NOT delete extension storage
- Uninstalling the extension deletes all stored notes

## Usage Tips

### 💡 Best Practices
1. **Use descriptive content** - The popup shows note previews, so meaningful content helps
2. **Create multiple notes** - You can have multiple notes per page, each with its own timestamp
3. **Regular saves** - The auto-save feature works well, but manual save is available if needed
4. **Review your notes** - Check the popup to see all notes for a page before creating new ones

### ⚙️ Keyboard Shortcuts
- **Tab** - Move between editor and buttons
- **Ctrl/Cmd + S** - Manual save (if implemented)
- **Escape** - Close editor (if implemented)

## Technical Details

### Permissions Used
- `storage` - Access to Chrome's local storage API
- `tabs` - Get current tab information
- `scripting` - Inject content script into pages
- `<all_urls>` - Run on any website

### Message Passing
The extension uses Chrome's message passing API for communication:
- **Content Script** ↔ **Background Service Worker** ↔ **Popup**

### Storage API
All notes are stored using `chrome.storage.local`:
- Synchronous read/write operations
- Automatic sync across extension contexts
- No network calls required

## Troubleshooting

### Editor doesn't appear
1. Refresh the page
2. Check if the extension is enabled in `chrome://extensions/`
3. Try reloading the extension

### Notes not saving
1. Check if storage is enabled in extension settings
2. Verify you have enough storage space
3. Check browser console for errors (F12)

### Extension icon missing
1. Go to `chrome://extensions/`
2. Find "Float Note"
3. Click the pin icon to show it in the toolbar

## Development

### Building from Source
```bash
# Install dependencies (if any)
npm install

# Load unpacked in Chrome for development
# Go to chrome://extensions/ → Load unpacked → Select this directory
```

### Modifying the Extension
- **manifest.json** - Change permissions, name, version
- **background.js** - Modify storage logic
- **content.js** - Update editor UI/behavior
- **popup.html/js** - Change popup interface

### Testing
1. Make changes to files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension
4. Test on a webpage

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+ (Chromium-based)
- ✅ Brave, Vivaldi, and other Chromium browsers

## Security & Privacy

- **Local Storage Only** - All notes are stored locally on your device
- **No Cloud Sync** - Notes never leave your browser
- **No Analytics** - The extension doesn't track usage
- **No Permissions Abuse** - Only accesses what's necessary

## License

This extension is provided as-is for personal use.

## Support

For issues or feature requests:
1. Check the troubleshooting section above
2. Review the console logs (F12 → Console tab)
3. Verify the extension is properly installed

---

**Version**: 1.0.0  
**Last Updated**: March 2026
