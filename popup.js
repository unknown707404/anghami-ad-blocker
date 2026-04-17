/**
 * Anghami Ad Blocker — Popup Script
 *
 * Controls toggle, shows status, displays blocked counts.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "anghamiAdBlockerEnabled";
  const ANGHAMI_ORIGIN = "https://play.anghami.com";

  const toggle = document.getElementById("toggle");
  const statusEl = document.getElementById("status");
  const siteWarning = document.getElementById("siteWarning");
  const networkCountEl = document.getElementById("networkCount");
  const domCountEl = document.getElementById("domCount");

  let currentTabId = null;
  let isAnghamiTab = false;

  function updateUI(enabled) {
    toggle.checked = enabled;
    if (enabled) {
      statusEl.textContent = "Blocking Active";
      statusEl.className = "status active";
    } else {
      statusEl.textContent = "Blocking Disabled";
      statusEl.className = "status inactive";
    }
  }

  function fetchStats() {
    if (!currentTabId || !isAnghamiTab) return;

    // Get network blocked count from background
    chrome.runtime.sendMessage(
      { type: "getBlockedCount", tabId: currentTabId },
      (response) => {
        if (response && networkCountEl) {
          networkCountEl.textContent = response.count || 0;
        }
      }
    );

    // Get DOM removed count from content script
    chrome.tabs.sendMessage(
      currentTabId,
      { type: "getContentStats" },
      (response) => {
        if (chrome.runtime.lastError) return; // content script not loaded
        if (response && domCountEl) {
          domCountEl.textContent = response.removed || 0;
        }
      }
    );
  }

  // Detect current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    currentTabId = tabs[0].id;
    const url = tabs[0].url || "";
    isAnghamiTab = url.startsWith(ANGHAMI_ORIGIN);

    if (!isAnghamiTab) {
      siteWarning.style.display = "block";
    }

    // Load saved state
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const enabled = result[STORAGE_KEY] !== false;
      updateUI(enabled);
    });

    fetchStats();
  });

  // Handle toggle
  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;

    chrome.storage.local.set({ [STORAGE_KEY]: enabled });
    updateUI(enabled);

    if (currentTabId && isAnghamiTab) {
      chrome.tabs.sendMessage(
        currentTabId,
        { type: "toggle", enabled: enabled },
        () => {
          if (chrome.runtime.lastError) {
            // Content script not yet injected — reload the tab
            chrome.tabs.reload(currentTabId);
          }
        }
      );
    }
  });
})();
