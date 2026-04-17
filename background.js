/**
 * Anghami Ad Blocker — Background Service Worker
 *
 * Tracks blocked request count per tab using declarativeNetRequest feedback.
 */

(function () {
  "use strict";

  const blockedCounts = {};

  // Reset count when a tab navigates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "loading") {
      blockedCounts[tabId] = 0;
    }
  });

  // Clean up when tab closes
  chrome.tabs.onRemoved.addListener((tabId) => {
    delete blockedCounts[tabId];
  });

  // Count blocked requests via onRuleMatchedDebug (only works with declarativeNetRequestFeedback permission in dev mode)
  // For unpacked extensions, this fires automatically.
  if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
      const tabId = info.request.tabId;
      if (tabId > 0) {
        blockedCounts[tabId] = (blockedCounts[tabId] || 0) + 1;
      }
    });
  }

  // Respond to popup asking for the count
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getBlockedCount") {
      sendResponse({ count: blockedCounts[message.tabId] || 0 });
    }
  });
})();
