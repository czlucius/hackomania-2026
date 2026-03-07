// Background Service Worker for Telegram Fake News Checker
// Handles API calls and background processing

const FACT_CHECK_APIS = {
  // Google Fact Check Tools API (requires API key)
  google: {
    url: 'https://factchecktools.googleapis.com/v1alpha1/claims:search',
    enabled: false
  },
  // NewsAPI for source verification (requires API key)
  newsapi: {
    url: 'https://newsapi.org/v2/everything',
    enabled: false
  },
  // Mock API for demo purposes
  mock: {
    enabled: true
  }
};

// Cache for fact-check results
const factCheckCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Initialize service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Telegram Fake News Checker installed');

  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    checkingMode: 'automatic',
    apiKeys: {
      google: '',
      newsapi: ''
    },
    statistics: {
      messagesChecked: 0,
      flaggedMessages: 0,
      lastCheck: null
    }
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkFakeNews') {
    handleFactCheck(request.text)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'getStatistics') {
    chrome.storage.sync.get(['statistics'], (result) => {
      sendResponse({ success: true, data: result.statistics || {} });
    });
    return true;
  }

  if (request.action === 'clearCache') {
    factCheckCache.clear();
    sendResponse({ success: true });
    return true;
  }
});

// Handle fact-checking request
async function handleFactCheck(text) {
  // Check cache first
  const cacheKey = hashText(text);
  if (factCheckCache.has(cacheKey)) {
    const cached = factCheckCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached result');
      return cached.result;
    }
  }

  // Update statistics
  updateStatistics('messagesChecked');

  // Get API keys from storage
  const settings = await chrome.storage.sync.get(['apiKeys']);
  const apiKeys = settings.apiKeys || {};

  let result;

  // Try Google Fact Check API if available
  if (apiKeys.google && FACT_CHECK_APIS.google.enabled) {
    try {
      result = await checkWithGoogleAPI(text, apiKeys.google);
      if (result) {
        cacheResult(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('Google API error:', error);
    }
  }

  // Try NewsAPI if available
  if (apiKeys.newsapi && FACT_CHECK_APIS.newsapi.enabled) {
    try {
      result = await checkWithNewsAPI(text, apiKeys.newsapi);
      if (result) {
        cacheResult(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('NewsAPI error:', error);
    }
  }

  // Fall back to mock analysis
  result = await mockFactCheck(text);
  cacheResult(cacheKey, result);
  return result;
}

// Check with Google Fact Check Tools API
async function checkWithGoogleAPI(text, apiKey) {
  const query = extractMainClaim(text);
  const url = `${FACT_CHECK_APIS.google.url}?query=${encodeURIComponent(query)}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.claims && data.claims.length > 0) {
    const claim = data.claims[0];
    const review = claim.claimReview && claim.claimReview[0];

    return {
      result: review ? review.textualRating : 'No rating available',
      sources: review ? review.publisher.name : 'Unknown',
      url: review ? review.url : null,
      confidence: 'high',
      api: 'google'
    };
  }

  return null;
}

// Check with NewsAPI
async function checkWithNewsAPI(text, apiKey) {
  const keywords = extractKeywords(text);
  const url = `${FACT_CHECK_APIS.newsapi.url}?q=${encodeURIComponent(keywords.join(' '))}&apiKey=${apiKey}&pageSize=5`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status}`);
  }

  const data = await response.json();

  if (data.articles && data.articles.length > 0) {
    const sources = data.articles.map(a => a.source.name).join(', ');
    return {
      result: `Found ${data.articles.length} articles about this topic from mainstream sources`,
      sources: sources,
      confidence: 'medium',
      api: 'newsapi'
    };
  }

  return null;
}

// Mock fact-checking for demo purposes
async function mockFactCheck(text) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  const lowerText = text.toLowerCase();

  // Simple heuristic-based mock analysis
  let credibilityScore = 50;
  let verdict = 'Unverified';
  const warnings = [];

  // Check for common fake news patterns
  if (/breaking|urgent|shocking/i.test(text)) {
    credibilityScore -= 15;
    warnings.push('Sensationalist language detected');
  }

  if (/scientists hate|doctors hate|they don't want you to know/i.test(text)) {
    credibilityScore -= 25;
    warnings.push('Common fake news phrases detected');
  }

  if (/according to|study shows|research indicates|official|confirmed/i.test(text)) {
    credibilityScore += 20;
    warnings.push('Contains reference to sources (not verified)');
  }

  // Check for URLs
  const urlMatches = text.match(/https?:\/\/[^\s]+/g);
  if (urlMatches) {
    const suspiciousDomains = ['.tk', '.ga', '.ml', '.cf', '.gq', 'bit.ly', 'tinyurl'];
    const hasSuspiciousDomain = urlMatches.some(url =>
      suspiciousDomains.some(domain => url.includes(domain))
    );

    if (hasSuspiciousDomain) {
      credibilityScore -= 20;
      warnings.push('Contains suspicious or shortened URLs');
    }
  }

  // Determine verdict
  if (credibilityScore < 30) {
    verdict = 'Likely False - High risk of misinformation';
  } else if (credibilityScore < 50) {
    verdict = 'Questionable - Verify before sharing';
  } else if (credibilityScore < 70) {
    verdict = 'Unverified - Unable to confirm';
  } else {
    verdict = 'Appears Credible - Contains source references';
  }

  return {
    result: verdict,
    sources: 'Local Analysis',
    confidence: 'low',
    credibilityScore: credibilityScore,
    warnings: warnings,
    api: 'mock',
    note: 'This is a basic analysis. For accurate fact-checking, please verify with reputable fact-checking organizations.'
  };
}

// Extract main claim from text
function extractMainClaim(text) {
  // Simple extraction: take first sentence or first 150 characters
  const firstSentence = text.split(/[.!?]/)[0];
  return firstSentence.length > 150
    ? firstSentence.substring(0, 150)
    : firstSentence;
}

// Extract keywords from text
function extractKeywords(text) {
  // Remove common words and extract meaningful terms
  const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of'];
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));

  // Return top 5 most relevant words
  return [...new Set(words)].slice(0, 5);
}

// Hash text for caching
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

// Cache result
function cacheResult(key, result) {
  factCheckCache.set(key, {
    result: result,
    timestamp: Date.now()
  });

  // Limit cache size
  if (factCheckCache.size > 100) {
    const firstKey = factCheckCache.keys().next().value;
    factCheckCache.delete(firstKey);
  }
}

// Update statistics
function updateStatistics(field) {
  chrome.storage.sync.get(['statistics'], (result) => {
    const stats = result.statistics || {
      messagesChecked: 0,
      flaggedMessages: 0,
      lastCheck: null
    };

    if (field === 'messagesChecked') {
      stats.messagesChecked++;
    } else if (field === 'flaggedMessages') {
      stats.flaggedMessages++;
    }

    stats.lastCheck = new Date().toISOString();

    chrome.storage.sync.set({ statistics: stats });
  });
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of factCheckCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      factCheckCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run every hour

console.log('Telegram Fake News Checker service worker loaded');
