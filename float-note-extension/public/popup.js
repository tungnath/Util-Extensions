// Popup Script for Float Note Extension
// Handles UI interactions and note management

let currentTab = null;
let currentNoteKey = null;
let currentContent = '';

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Get current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      currentTab = tabs[0];
      const url = currentTab.url;

      if (isRestrictedUrl(url)) {
        showMessage("Float Note can't run on this page. Open a page with valid url(http/https) and try again.");
        document.getElementById('toggleEditorBtn').disabled = true;
        return;
      }

      // Initialize tab in background
      chrome.runtime.sendMessage(
        { action: 'initializeTab', url },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            // The editor must stay usable if the service worker did not answer, so fall back to
            // a fresh key rather than leaving currentNoteKey null -- a null key makes every save
            // in the editor silently do nothing.
            currentNoteKey = `${url}|${Date.now()}`;
            return;
          }

          currentNoteKey = response.noteKey;
          currentContent = response.content;
          loadNotesForCurrentPage();
        }
      );
    }
  });

  // Set up button listeners
  document.getElementById('toggleEditorBtn').addEventListener('click', toggleEditor);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllNotes);
});

// Pages where extensions are not permitted to run any script
function isRestrictedUrl(url) {
  if (!url) return true;
  if (/^(chrome|edge|brave|opera|vivaldi|about|chrome-extension|moz-extension|devtools|view-source):/i.test(url)) {
    return true;
  }
  // The Chrome Web Store is blocked for all extensions
  return /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i.test(url);
}

// Surface a problem in the popup instead of failing silently
function showMessage(text) {
  const el = document.getElementById('popupMessage');
  if (!el) return;
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
}

// Load and display notes for current page
function loadNotesForCurrentPage() {
  if (!currentTab) return;

  const url = currentTab.url;

  chrome.runtime.sendMessage(
    { action: 'getNotesByUrl', url },
    (response) => {
      if (response && response.notes) {
        displayNotes(response.notes);
      }
    }
  );
}

// Display notes in the popup
function displayNotes(notes) {
  const notesList = document.getElementById('notesList');
  notesList.textContent = '';

  if (notes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-state-icon';
    icon.textContent = '📭';

    const text = document.createElement('div');
    text.textContent = 'No notes yet. Create one to get started!';

    empty.append(icon, text);
    notesList.appendChild(empty);
    return;
  }

  // Built with DOM APIs rather than innerHTML: note content is user-authored text and must
  // never be parsed as markup inside the extension popup.
  notes.forEach((note) => {
    const date = new Date(parseInt(note.timestamp));
    const preview = note.content.substring(0, 50).replace(/\n/g, ' ');

    const item = document.createElement('div');
    item.className = 'note-item';

    const info = document.createElement('div');
    info.className = 'note-item-info';

    const time = document.createElement('div');
    time.className = 'note-item-time';
    time.textContent = formatTime(date);

    const previewEl = document.createElement('div');
    previewEl.className = 'note-item-preview';
    previewEl.textContent = preview || '(empty note)';

    info.append(time, previewEl);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-item-delete';
    deleteBtn.title = 'Delete note';
    deleteBtn.textContent = '🗑️';

    item.append(info, deleteBtn);
    notesList.appendChild(item);

    item.addEventListener('click', (e) => {
      if (e.target !== deleteBtn) {
        resumeNote(note.key);
      }
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(note.key);
    });
  });
}

// Resume a specific note
function resumeNote(noteKey) {
  chrome.runtime.sendMessage(
    { action: 'getNote', noteKey },
    (response) => {
      if (response) {
        currentNoteKey = noteKey;
        currentContent = response.content;
        toggleEditor();
      }
    }
  );
}

// Toggle editor visibility
//
// Ordering matters here. The popup document is destroyed the moment window.close() runs and
// every pending callback in it dies with it, so the editor has to be confirmed open BEFORE the
// popup closes. Closing on a timer races the injection and drops the toggle message.
function toggleEditor() {
  if (!currentTab || !currentTab.id) return;

  if (isRestrictedUrl(currentTab.url)) {
    showMessage("Float Note can't run on this page.");
    return;
  }

  showMessage('');

  const message = {
    action: 'toggleEditor',
    noteKey: currentNoteKey || `${currentTab.url}|${Date.now()}`,
    content: currentContent
  };

  // Inject first, then send. content.js guards against double-injection, so injecting
  // unconditionally is a no-op when it is already loaded -- and it removes the
  // "send, fail, inject, re-send" race entirely.
  chrome.scripting.executeScript(
    {
      target: { tabId: currentTab.id },
      files: ['content.js']
    },
    () => {
      if (chrome.runtime.lastError) {
        showMessage(
          'Float Note needs access to this page. Right-click the extension icon, open ' +
          '"This can read and change site data" and choose "On all sites", then try again.'
        );
        console.error('Float Note could not inject content.js:', chrome.runtime.lastError.message);
        return;
      }

      chrome.tabs.sendMessage(currentTab.id, message, () => {
        if (chrome.runtime.lastError) {
          showMessage('Could not reach this page. Reload the tab and try again.');
          console.error('Float Note could not reach content.js:', chrome.runtime.lastError.message);
          return;
        }

        // Close only after the content script has acknowledged the toggle.
        window.close();
      });
    }
  );
}

// Delete a note
function deleteNote(noteKey) {
  if (!confirm('Delete this note?')) return;

  chrome.runtime.sendMessage(
    { action: 'deleteNote', noteKey },
    (response) => {
      if (response && response.success) {
        loadNotesForCurrentPage();
      }
    }
  );
}

// Clear all notes for current page
function clearAllNotes() {
  if (!currentTab) return;

  if (!confirm('Delete all notes for this page? This cannot be undone.')) return;

  const url = currentTab.url;

  chrome.runtime.sendMessage(
    { action: 'getNotesByUrl', url },
    (response) => {
      if (!response || !response.notes) return;

      let remaining = response.notes.length;
      if (remaining === 0) {
        loadNotesForCurrentPage();
        return;
      }

      // Refresh once every delete has actually completed, rather than guessing with a timer.
      response.notes.forEach((note) => {
        chrome.runtime.sendMessage(
          { action: 'deleteNote', noteKey: note.key },
          () => {
            remaining -= 1;
            if (remaining === 0) {
              currentNoteKey = `${url}|${Date.now()}`;
              currentContent = '';
              loadNotesForCurrentPage();
            }
          }
        );
      });
    }
  );
}

// Format timestamp to readable time
function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}
