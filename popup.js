// Popup script for Telegram Fake News Checker
// Handles user interactions and settings management

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const enableToggle = document.getElementById('enableToggle');
  const statusIndicator = document.getElementById('statusIndicator');
  const messagesChecked = document.getElementById('messagesChecked');
  const messagesFlagged = document.getElementById('messagesFlagged');
  const messageContainer = document.getElementById('messageContainer');
  const clearCacheBtn = document.getElementById('clearCache');
  const reanalyzeBtn = document.getElementById('reanalyze');
  const saveApiKeysBtn = document.getElementById('saveApiKeys');
  const googleApiKeyInput = document.getElementById('googleApiKey');
  const newsApiKeyInput = document.getElementById('newsApiKey');
  const modeOptions = document.querySelectorAll('.mode-option');
  const collapsibles = document.querySelectorAll('.collapsible');

  // Initialize popup
  init();

  function init() {
    loadSettings();
    loadStatistics();
    setupEventListeners();
    setupCollapsibles();
  }

  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(['enabled', 'checkingMode', 'apiKeys'], function(result) {
      // Set enable toggle
      enableToggle.checked = result.enabled !== false;
      updateStatusIndicator(result.enabled !== false);

      // Set checking mode
      const mode = result.checkingMode || 'automatic';
      document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
      updateModeSelection(mode);

      // Load API keys
      if (result.apiKeys) {
        if (result.apiKeys.google) {
          googleApiKeyInput.value = result.apiKeys.google;
        }
        if (result.apiKeys.newsapi) {
          newsApiKeyInput.value = result.apiKeys.newsapi;
        }
      }
    });
  }

  // Load statistics
  function loadStatistics() {
    chrome.storage.sync.get(['statistics'], function(result) {
      if (result.statistics) {
        messagesChecked.textContent = result.statistics.messagesChecked || 0;
        messagesFlagged.textContent = result.statistics.flaggedMessages || 0;
      }
    });
  }

  // Setup event listeners
  function setupEventListeners() {
    // Enable/disable toggle
    enableToggle.addEventListener('change', function() {
      const enabled = this.checked;
      chrome.storage.sync.set({ enabled: enabled }, function() {
        updateStatusIndicator(enabled);
        showMessage(enabled ? 'Extension enabled' : 'Extension disabled', 'success');

        // Notify content script
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('web.telegram.org')) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'toggleExtension',
              enabled: enabled
            });
          }
        });
      });
    });

    // Mode selection
    modeOptions.forEach(option => {
      option.addEventListener('click', function() {
        const radio = this.querySelector('input[type="radio"]');
        radio.checked = true;
        const mode = radio.value;

        chrome.storage.sync.set({ checkingMode: mode }, function() {
          updateModeSelection(mode);
          showMessage(`Switched to ${mode} mode`, 'success');
        });
      });
    });

    // Clear cache button
    clearCacheBtn.addEventListener('click', function() {
      chrome.runtime.sendMessage({ action: 'clearCache' }, function(response) {
        if (response && response.success) {
          showMessage('Cache cleared successfully', 'success');
        } else {
          showMessage('Failed to clear cache', 'error');
        }
      });
    });

    // Re-analyze button
    reanalyzeBtn.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('web.telegram.org')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'reanalyzeMessages'
          }, function(response) {
            if (response && response.success) {
              showMessage('Re-analyzing messages...', 'success');
            } else {
              showMessage('Please open Telegram Web first', 'error');
            }
          });
        } else {
          showMessage('Please open Telegram Web to re-analyze messages', 'error');
        }
      });
    });

    // Save API keys button
    saveApiKeysBtn.addEventListener('click', function() {
      const googleKey = googleApiKeyInput.value.trim();
      const newsKey = newsApiKeyInput.value.trim();

      chrome.storage.sync.set({
        apiKeys: {
          google: googleKey,
          newsapi: newsKey
        }
      }, function() {
        showMessage('API keys saved successfully', 'success');
      });
    });

    // Footer links
    document.getElementById('howItWorks').addEventListener('click', function(e) {
      e.preventDefault();
      showHowItWorks();
    });

    document.getElementById('reportIssue').addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/yourusername/telegram-fake-news-checker/issues' });
    });

    document.getElementById('about').addEventListener('click', function(e) {
      e.preventDefault();
      showAbout();
    });
  }

  // Setup collapsible sections
  function setupCollapsibles() {
    collapsibles.forEach(collapsible => {
      collapsible.addEventListener('click', function() {
        this.classList.toggle('active');
        const content = this.nextElementSibling;
        content.classList.toggle('active');
      });
    });
  }

  // Update status indicator
  function updateStatusIndicator(enabled) {
    const dot = statusIndicator.querySelector('.status-dot');
    const text = statusIndicator.querySelector('span:last-child');

    if (enabled) {
      statusIndicator.classList.remove('inactive');
      statusIndicator.classList.add('active');
      dot.classList.remove('inactive');
      dot.classList.add('active');
      text.textContent = 'Active';
    } else {
      statusIndicator.classList.remove('active');
      statusIndicator.classList.add('inactive');
      dot.classList.remove('active');
      dot.classList.add('inactive');
      text.textContent = 'Inactive';
    }
  }

  // Update mode selection visual
  function updateModeSelection(mode) {
    modeOptions.forEach(option => {
      const radio = option.querySelector('input[type="radio"]');
      if (radio.value === mode) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }

  // Show message to user
  function showMessage(text, type) {
    // Remove existing messages
    const existingMessages = messageContainer.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    // Create new message
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    messageContainer.appendChild(message);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      message.style.opacity = '0';
      message.style.transition = 'opacity 0.3s';
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }

  // Show "How it works" modal
  function showHowItWorks() {
    const modal = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;" id="infoModal">
        <div style="background: white; padding: 25px; border-radius: 12px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
          <h2 style="margin-bottom: 15px; color: #667eea;">How It Works</h2>
          <div style="font-size: 13px; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 10px;"><strong>1. Local Analysis</strong></p>
            <p style="margin-bottom: 15px;">The extension scans Telegram messages for suspicious patterns including sensationalist language, emotional manipulation, and unverified claims.</p>

            <p style="margin-bottom: 10px;"><strong>2. Risk Scoring</strong></p>
            <p style="margin-bottom: 15px;">Each message receives a risk score based on multiple factors. Messages with higher risk scores are flagged for your attention.</p>

            <p style="margin-bottom: 10px;"><strong>3. Warning Indicators</strong></p>
            <p style="margin-bottom: 15px;">Flagged messages display color-coded warnings with detailed explanations of why they were flagged.</p>

            <p style="margin-bottom: 10px;"><strong>4. External Verification</strong></p>
            <p style="margin-bottom: 15px;">You can optionally verify messages using external fact-checking APIs for more accurate results.</p>

            <p style="margin-bottom: 10px;"><strong>Important Notes:</strong></p>
            <ul style="margin-left: 20px; margin-bottom: 15px;">
              <li>This tool provides guidance, not absolute truth</li>
              <li>Always verify important information from multiple sources</li>
              <li>Some legitimate messages may be flagged</li>
              <li>Use your critical thinking skills</li>
            </ul>
          </div>
          <button style="width: 100%; padding: 10px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; margin-top: 10px;" onclick="document.getElementById('infoModal').remove()">Got it!</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
  }

  // Show "About" modal
  function showAbout() {
    const modal = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;" id="infoModal">
        <div style="background: white; padding: 25px; border-radius: 12px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
          <h2 style="margin-bottom: 15px; color: #667eea;">About This Extension</h2>
          <div style="font-size: 13px; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 15px;"><strong>Telegram Fake News Checker v1.0.0</strong></p>

            <p style="margin-bottom: 15px;">This extension helps identify potential misinformation in Telegram Web chats using advanced heuristic analysis and optional fact-checking APIs.</p>

            <p style="margin-bottom: 10px;"><strong>Features:</strong></p>
            <ul style="margin-left: 20px; margin-bottom: 15px;">
              <li>Real-time message analysis</li>
              <li>Automatic and manual checking modes</li>
              <li>Risk scoring and detailed explanations</li>
              <li>Integration with fact-checking APIs</li>
              <li>Privacy-focused (no data collection)</li>
            </ul>

            <p style="margin-bottom: 10px;"><strong>Privacy Policy:</strong></p>
            <p style="margin-bottom: 15px;">This extension does not collect, store, or transmit any personal data. All analysis is performed locally in your browser unless you explicitly request external fact-checking.</p>

            <p style="margin-bottom: 10px;"><strong>Open Source:</strong></p>
            <p style="margin-bottom: 15px;">This project is open source. Contributions and feedback are welcome!</p>

            <p style="margin-bottom: 10px; font-size: 11px; color: #666;">Created for Hackomania 2026</p>
          </div>
          <button style="width: 100%; padding: 10px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; margin-top: 10px;" onclick="document.getElementById('infoModal').remove()">Close</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
  }

  // Refresh statistics periodically
  setInterval(loadStatistics, 5000);
});
