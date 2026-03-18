// Content Script for Float Note Extension
// Injects floating editor into the page and handles communication

let floatingEditorContainer = null;
let currentNoteKey = null;
let isEditorVisible = false;

// Initialize the content script
function initializeContentScript() {
  const url = window.location.href;

  // Send message to background to initialize tab
  chrome.runtime.sendMessage(
    { action: 'initializeTab', url },
    (response) => {
      if (response) {
        currentNoteKey = response.noteKey;
        // Don't auto-show editor, wait for user to click extension icon
      }
    }
  );

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showEditor') {
      showFloatingEditor(request.noteKey, request.content);
      sendResponse({ success: true });
    } else if (request.action === 'hideEditor') {
      hideFloatingEditor();
      sendResponse({ success: true });
    } else if (request.action === 'toggleEditor') {
      toggleFloatingEditor(request.noteKey, request.content);
      sendResponse({ success: true });
    }
  });
}

// Create and show the floating editor
function showFloatingEditor(noteKey, existingContent = '') {
  if (floatingEditorContainer) {
    // If the editor already exists in the page, make sure we're showing the latest note and content.
    currentNoteKey = noteKey;
    floatingEditorContainer.style.display = 'flex';

    const textarea = floatingEditorContainer.querySelector('#floating-note-textarea');
    if (textarea && existingContent !== undefined) {
      textarea.value = existingContent;
    }

    isEditorVisible = true;
    return;
  }

  currentNoteKey = noteKey;

  // Create container
  floatingEditorContainer = document.createElement('div');
  floatingEditorContainer.id = 'floating-note-editor-container';
  floatingEditorContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    height: 500px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    box-sizing: border-box;
  `;

  // Create editor HTML
  floatingEditorContainer.innerHTML = `
    <div style="
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.5);
      overflow: hidden;
      animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(255, 255, 255, 0.5);
      ">
        <h3 style="
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          letter-spacing: -0.5px;
        ">Float Note</h3>
        <button id="floating-note-close" style="
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          color: #666;
          font-size: 20px;
          line-height: 1;
          transition: color 0.2s;
        " title="Close editor">×</button>
      </div>
      
      <textarea id="floating-note-textarea" style="
        flex: 1;
        padding: 16px 20px;
        border: none;
        outline: none;
        resize: none;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        line-height: 1.6;
        color: #1a1a1a;
        background: transparent;
        overflow-y: auto;
      " placeholder="Start typing your note..."></textarea>

      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(255, 255, 255, 0.5);
        font-size: 12px;
        color: #999;
      ">
        <span id="floating-note-status">Ready</span>
        <button id="floating-note-save" style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
        ">Save</button>
      </div>
    </div>

    <style>
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0) translateX(0);
        }
      }

      #floating-note-close:hover {
        color: #1a1a1a;
      }

      #floating-note-save:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
      }

      #floating-note-save:active {
        transform: translateY(0);
      }

      #floating-note-textarea::-webkit-scrollbar {
        width: 6px;
      }

      #floating-note-textarea::-webkit-scrollbar-track {
        background: transparent;
      }

      #floating-note-textarea::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 3px;
      }

      #floating-note-textarea::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.2);
      }
    </style>
  `;

  document.body.appendChild(floatingEditorContainer);

  // Get references to elements (scoped to our injected editor to avoid collisions with page elements)
  const textarea = floatingEditorContainer.querySelector('#floating-note-textarea');
  const closeBtn = floatingEditorContainer.querySelector('#floating-note-close');
  const saveBtn = floatingEditorContainer.querySelector('#floating-note-save');
  const statusSpan = floatingEditorContainer.querySelector('#floating-note-status');

  // Set existing content
  if (existingContent) {
    textarea.value = existingContent;
  }

  // Auto-save on input (debounced)
  let saveTimeout;
  textarea.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    statusSpan.textContent = 'Unsaved changes...';
    statusSpan.style.color = '#ff9800';

    saveTimeout = setTimeout(() => {
      saveNoteContent(textarea.value, statusSpan);
    }, 2000);
  });

  // Manual save button
  saveBtn.addEventListener('click', () => {
    saveNoteContent(textarea.value, statusSpan);
  });

  // Close button
  closeBtn.addEventListener('click', hideFloatingEditor);

  // Allow dragging
  makeEditorDraggable(floatingEditorContainer);

  isEditorVisible = true;
}

// Hide the floating editor
function hideFloatingEditor() {
  if (floatingEditorContainer) {
    floatingEditorContainer.style.display = 'none';
    isEditorVisible = false;
  }
}

// Toggle editor visibility
function toggleFloatingEditor(noteKey, content) {
  if (isEditorVisible && floatingEditorContainer) {
    hideFloatingEditor();
  } else {
    showFloatingEditor(noteKey, content);
  }
}

// Save note content to storage
function saveNoteContent(content, statusSpan) {
  if (!currentNoteKey) return;

  chrome.runtime.sendMessage(
    { action: 'saveNote', noteKey: currentNoteKey, content },
    (response) => {
      if (response && response.success) {
        statusSpan.textContent = 'Saved';
        statusSpan.style.color = '#4caf50';
        setTimeout(() => {
          statusSpan.textContent = 'Ready';
          statusSpan.style.color = '#999';
        }, 2000);
      }
    }
  );
}

// Make editor draggable
function makeEditorDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = element.querySelector('div:first-child');
  const textarea = element.querySelector('textarea');

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    // Don't drag if clicking on buttons or textarea
    if (e.target.tagName === 'BUTTON' || e.target === textarea) {
      return;
    }
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + 'px';
    element.style.left = (element.offsetLeft - pos1) + 'px';
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}
