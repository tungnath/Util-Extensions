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

      // Initialize tab in background
      chrome.runtime.sendMessage(
        { action: 'initializeTab', url },
        (response) => {
          if (response) {
            currentNoteKey = response.noteKey;
            currentContent = response.content;
            loadNotesForCurrentPage();
          }
        }
      );
    }
  });

  // Set up button listeners
  document.getElementById('toggleEditorBtn').addEventListener('click', toggleEditor);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllNotes);
});

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

  if (notes.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div>No notes yet. Create one to get started!</div>
      </div>
    `;
    return;
  }

  notesList.innerHTML = notes
    .map((note) => {
      const date = new Date(parseInt(note.timestamp));
      const timeStr = formatTime(date);
      const preview = note.content.substring(0, 50).replace(/\n/g, ' ');

      return `
        <div class="note-item" data-key="${note.key}">
          <div class="note-item-info">
            <div class="note-item-time">${timeStr}</div>
            <div class="note-item-preview">${preview || '(empty note)'}</div>
          </div>
          <button class="note-item-delete" data-key="${note.key}" title="Delete note">🗑️</button>
        </div>
      `;
    })
    .join('');

  // Add click listeners
  document.querySelectorAll('.note-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('note-item-delete')) {
        const key = item.getAttribute('data-key');
        resumeNote(key);
      }
    });
  });

  document.querySelectorAll('.note-item-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.getAttribute('data-key');
      deleteNote(key);
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
function toggleEditor() {
  if (!currentTab) return;

  chrome.tabs.sendMessage(
    currentTab.id,
    {
      action: 'toggleEditor',
      noteKey: currentNoteKey,
      content: currentContent
    },
    (response) => {
      if (chrome.runtime.lastError) {
        // Content script not loaded, inject it
        injectContentScript();
      }
    }
  );

  // Close popup after opening editor
  setTimeout(() => {
    window.close();
  }, 100);
}

// Inject content script into current tab
function injectContentScript() {
  if (!currentTab) return;

  chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    files: ['content.js']
  }, () => {
    // After injection, try to toggle editor again
    setTimeout(() => {
      chrome.tabs.sendMessage(
        currentTab.id,
        {
          action: 'toggleEditor',
          noteKey: currentNoteKey,
          content: currentContent
        }
      );
    }, 100);
  });
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
      if (response && response.notes) {
        response.notes.forEach((note) => {
          chrome.runtime.sendMessage({
            action: 'deleteNote',
            noteKey: note.key
          });
        });

        setTimeout(() => {
          loadNotesForCurrentPage();
        }, 100);
      }
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
