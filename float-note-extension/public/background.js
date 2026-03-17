// Background Service Worker for Float Note Extension
// Manages tab state, storage coordination, and message passing

// Map to track active tabs and their note keys
const tabNoteMap = new Map();

// Listen for tab updates to track when tabs are created/closed
chrome.tabs.onCreated.addListener((tab) => {
  // Initialize new tab
  if (tab.id) {
    tabNoteMap.set(tab.id, null);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  // Clean up when tab is closed
  tabNoteMap.delete(tabId);
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (request.action === 'initializeTab') {
    // Initialize tab with URL and check for existing notes
    const url = request.url;
    handleInitializeTab(tabId, url, sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'saveNote') {
    // Save note to storage
    const { noteKey, content } = request;
    chrome.storage.local.set({ [noteKey]: content }, () => {
      if (tabId) {
        tabNoteMap.set(tabId, noteKey);
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getNote') {
    // Retrieve note from storage
    const { noteKey } = request;
    chrome.storage.local.get([noteKey], (result) => {
      sendResponse({ content: result[noteKey] || '' });
    });
    return true;
  }

  if (request.action === 'getNotesByUrl') {
    // Get all notes for a specific URL
    const { url } = request;
    chrome.storage.local.get(null, (allItems) => {
      const urlNotes = Object.entries(allItems)
        .filter(([key]) => key.startsWith(url + '|'))
        .map(([key, content]) => {
          const timestamp = key.split('|')[1];
          return { key, timestamp, content };
        })
        .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
      sendResponse({ notes: urlNotes });
    });
    return true;
  }

  if (request.action === 'deleteNote') {
    // Delete a note from storage
    const { noteKey } = request;
    chrome.storage.local.remove([noteKey], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle tab initialization
function handleInitializeTab(tabId, url, sendResponse) {
  // Generate a note key for this tab session
  const timestamp = Date.now();
  const noteKey = `${url}|${timestamp}`;

  // Check if there's an existing note for this URL
  chrome.storage.local.get(null, (allItems) => {
    const existingNotes = Object.entries(allItems)
      .filter(([key]) => key.startsWith(url + '|'))
      .map(([key, content]) => {
        const ts = key.split('|')[1];
        return { key, timestamp: ts, content };
      })
      .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

    // If there are existing notes, use the most recent one
    const noteToUse = existingNotes.length > 0 ? existingNotes[0].key : noteKey;
    const existingContent = existingNotes.length > 0 ? existingNotes[0].content : '';

    if (tabId) {
      tabNoteMap.set(tabId, noteToUse);
    }

    sendResponse({
      noteKey: noteToUse,
      content: existingContent,
      isResume: existingNotes.length > 0
    });
  });
}

// On extension install/update
chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage if needed
  chrome.storage.local.get(null, (items) => {
    if (Object.keys(items).length === 0) {
      // Storage is empty, ready to go
      console.log('Float Note extension installed and ready');
    }
  });
});
