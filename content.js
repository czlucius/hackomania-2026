// Content script for Telegram Fake News Checker
// This script runs on Telegram Web and analyzes messages for potential fake news

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    checkInterval: 1000, // Check for new messages every second
    minTextLength: 50, // Minimum text length to analyze
    suspiciousKeywords: [
      'breaking', 'urgent', 'shocking', 'miracle', 'secret',
      'they don\'t want you to know', 'scientists hate', 'doctors hate',
      'one weird trick', 'you won\'t believe', 'click here', 'share now',
      'this will blow your mind', 'must read', 'must watch', 'viral'
    ],
    urlPattern: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
  };

  // Store processed messages to avoid reprocessing
  const processedMessages = new WeakSet();
  let isEnabled = true;
  let checkingMode = 'automatic'; // 'automatic' or 'manual'

  // Initialize extension
  function init() {
    console.log('Telegram Fake News Checker initialized');

    // Load settings from storage
    chrome.storage.sync.get(['enabled', 'checkingMode'], function(result) {
      isEnabled = result.enabled !== false; // Default to true
      checkingMode = result.checkingMode || 'automatic';

      if (isEnabled) {
        startMonitoring();
      }
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (changes.enabled) {
        isEnabled = changes.enabled.newValue;
        if (isEnabled) {
          startMonitoring();
        }
      }
      if (changes.checkingMode) {
        checkingMode = changes.checkingMode.newValue;
      }
    });
  }

  // Start monitoring for messages
  function startMonitoring() {
    // Observer for new messages
    const observer = new MutationObserver((mutations) => {
      if (!isEnabled) return;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            findAndAnalyzeMessages(node);
          }
        });
      });
    });

    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial scan of existing messages
    findAndAnalyzeMessages(document.body);
  }

  // Find message elements in Telegram Web
  function findAndAnalyzeMessages(root) {
    // Telegram Web message selectors (may need updates as Telegram changes)
    const messageSelectors = [
      '.message',
      '[class*="Message"]',
      '.text-content',
      '[class*="text-content"]',
      '.message-content'
    ];

    messageSelectors.forEach(selector => {
      const messages = root.querySelectorAll ? root.querySelectorAll(selector) : [];
      messages.forEach(messageElement => {
        if (!processedMessages.has(messageElement)) {
          analyzeMessage(messageElement);
          processedMessages.add(messageElement);
        }
      });
    });
  }

  // Analyze a single message
  function analyzeMessage(messageElement) {
    const textContent = messageElement.textContent || '';

    if (textContent.length < CONFIG.minTextLength) {
      return; // Skip short messages
    }

    // Perform quick local analysis
    const localAnalysis = performLocalAnalysis(textContent);

    if (localAnalysis.riskScore > 0) {
      // Add warning indicator to message
      addWarningIndicator(messageElement, localAnalysis);

      // If automatic mode, also check with external API
      if (checkingMode === 'automatic' && localAnalysis.riskScore >= 50) {
        checkWithAPI(textContent, messageElement, localAnalysis);
      }
    }
  }

  // Perform local analysis using heuristics
  function performLocalAnalysis(text) {
    let riskScore = 0;
    const flags = [];
    const lowerText = text.toLowerCase();

    // Check for suspicious keywords
    let keywordCount = 0;
    CONFIG.suspiciousKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        keywordCount++;
        flags.push(`Contains suspicious keyword: "${keyword}"`);
      }
    });

    if (keywordCount > 0) {
      riskScore += Math.min(keywordCount * 15, 40);
    }

    // Check for excessive capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.3) {
      riskScore += 20;
      flags.push('Excessive use of capital letters');
    }

    // Check for excessive punctuation (!!!, ???, etc.)
    const excessivePunctuation = /[!?]{3,}/g;
    if (excessivePunctuation.test(text)) {
      riskScore += 15;
      flags.push('Excessive punctuation detected');
    }

    // Check for URLs (potential clickbait)
    const urls = text.match(CONFIG.urlPattern);
    if (urls && urls.length > 2) {
      riskScore += 10;
      flags.push('Multiple URLs detected');
    }

    // Check for lack of credible sources
    const hasCredibleSource = /according to|study by|research from|reported by/i.test(text);
    const hasClaim = /claim|alleged|reported that|says that/i.test(text);
    if (hasClaim && !hasCredibleSource) {
      riskScore += 15;
      flags.push('Claims without credible sources');
    }

    // Check for emotional manipulation
    const emotionalWords = ['shocking', 'terrifying', 'amazing', 'unbelievable', 'incredible', 'outrageous'];
    let emotionalCount = 0;
    emotionalWords.forEach(word => {
      if (lowerText.includes(word)) emotionalCount++;
    });
    if (emotionalCount >= 2) {
      riskScore += 10;
      flags.push('Emotional manipulation detected');
    }

    return {
      riskScore: Math.min(riskScore, 100),
      flags: flags,
      text: text
    };
  }

  // Add warning indicator to message
  function addWarningIndicator(messageElement, analysis) {
    // Check if indicator already exists
    if (messageElement.querySelector('.fake-news-indicator')) {
      return;
    }

    const indicator = document.createElement('div');
    indicator.className = 'fake-news-indicator';

    let severity = 'low';
    let icon = '⚠️';
    let color = '#ffa500';

    if (analysis.riskScore >= 70) {
      severity = 'high';
      icon = '🚫';
      color = '#ff0000';
    } else if (analysis.riskScore >= 40) {
      severity = 'medium';
      icon = '⚠️';
      color = '#ff6600';
    } else {
      severity = 'low';
      icon = 'ℹ️';
      color = '#ffcc00';
    }

    indicator.innerHTML = `
      <div class="fake-news-badge" data-severity="${severity}">
        <span class="fake-news-icon">${icon}</span>
        <span class="fake-news-text">Potential Misinformation (${analysis.riskScore}%)</span>
        <button class="fake-news-details-btn">Details</button>
      </div>
      <div class="fake-news-details" style="display: none;">
        <strong>Warning Flags:</strong>
        <ul>
          ${analysis.flags.map(flag => `<li>${flag}</li>`).join('')}
        </ul>
        <button class="fake-news-check-btn">Check with Fact-Checker</button>
        <button class="fake-news-dismiss-btn">Dismiss</button>
      </div>
    `;

    // Add event listeners
    const detailsBtn = indicator.querySelector('.fake-news-details-btn');
    const detailsDiv = indicator.querySelector('.fake-news-details');
    const checkBtn = indicator.querySelector('.fake-news-check-btn');
    const dismissBtn = indicator.querySelector('.fake-news-dismiss-btn');

    detailsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
    });

    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      checkBtn.disabled = true;
      checkBtn.textContent = 'Checking...';
      checkWithAPI(analysis.text, messageElement, analysis);
    });

    dismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      indicator.remove();
    });

    // Insert indicator
    messageElement.style.position = 'relative';
    messageElement.appendChild(indicator);
  }

  // Check message with external fact-checking API
  function checkWithAPI(text, messageElement, localAnalysis) {
    // Send message to background script for API call
    chrome.runtime.sendMessage({
      action: 'checkFakeNews',
      text: text
    }, (response) => {
      if (response && response.success) {
        updateIndicatorWithAPIResult(messageElement, response.data, localAnalysis);
      } else {
        updateIndicatorWithError(messageElement);
      }
    });
  }

  // Update indicator with API result
  function updateIndicatorWithAPIResult(messageElement, apiData, localAnalysis) {
    const indicator = messageElement.querySelector('.fake-news-indicator');
    if (!indicator) return;

    const detailsDiv = indicator.querySelector('.fake-news-details');
    const checkBtn = indicator.querySelector('.fake-news-check-btn');

    if (checkBtn) {
      checkBtn.remove();
    }

    const apiResultDiv = document.createElement('div');
    apiResultDiv.className = 'fake-news-api-result';
    apiResultDiv.innerHTML = `
      <strong>Fact-Check Results:</strong>
      <p>${apiData.result || 'Analysis complete'}</p>
      ${apiData.sources ? `<small>Sources: ${apiData.sources}</small>` : ''}
    `;

    detailsDiv.appendChild(apiResultDiv);
  }

  // Update indicator with error
  function updateIndicatorWithError(messageElement) {
    const indicator = messageElement.querySelector('.fake-news-indicator');
    if (!indicator) return;

    const checkBtn = indicator.querySelector('.fake-news-check-btn');
    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.textContent = 'Retry Check';
    }
  }

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleExtension') {
      isEnabled = request.enabled;
      sendResponse({ success: true });
    } else if (request.action === 'reanalyzeMessages') {
      processedMessages.clear();
      findAndAnalyzeMessages(document.body);
      sendResponse({ success: true });
    }
  });

  // Initialize the extension
  init();

})();
