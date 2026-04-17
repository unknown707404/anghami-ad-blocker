/**
 * Anghami Ad Blocker — Content Script
 *
 * Actively removes ad DOM elements, tracks count,
 * and responds to popup messages for stats and toggle.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "anghamiAdBlockerEnabled";

  let enabled = true;
  let removedCount = 0;
  let observer = null;

  // Selectors matching known Anghami and third-party ad elements.
  // Keep in sync with content.css (CSS hides instantly, JS removes permanently).
  const AD_SELECTORS = [
    // Anghami native ad banner
    "#native-ad-banner",
    "img[src*='anghnewads.anghcdn.co']",
    "img[src*='PlusFeatures']",
    // Anghami custom ad components
    "anghami-ads",
    "[class*='anghami-ad']",
    "[id*='anghami-ad']",
    // Promo / upgrade banners
    "[class*='promo-banner']",
    "[class*='promo-card']",
    "[class*='upgrade-banner']",
    "[class*='upgrade-card']",
    "[class*='plus-promo']",
    "[class*='offer-banner']",
    "[id*='promo-banner']",
    "[id*='upgrade-banner']",
    // Player leaderboard ad
    ".player-leaderboard",
    "[class*='player-leaderboard']",
    // Native ad video
    "#native-ad-video",
    "[id*='native-ad']",
    "[class*='native-ad']",
    // Third-party iframes
    "iframe[src*='doubleclick']",
    "iframe[src*='googlesyndication']",
    "iframe[src*='imasdk']",
    "iframe[name*='google_ads']",
    "iframe[src*='googlead']",
    // Generic ad containers
    "[class*='ad-container']",
    "[class*='ad-wrapper']",
    "[class*='ad-slot']",
    "[class*='ad-banner']",
    "[class*='ad-overlay']",
    "[class*='ad-placement']",
    "[id*='ad-container']",
    "[id*='ad-slot']",
    "[id*='ad-banner']",
    // Data-attribute ad markers
    "[data-ad-slot]",
    "[data-ad-unit]",
    "[data-adunit]",
    // Leaderboard / banner
    "[class*='leaderboard-ad']",
    "[class*='banner-ad']",
    "[id*='leaderboard-ad']",
    "[id*='banner-ad']",
  ];

  // Attribute used to mark already-removed nodes (avoids double-counting
  // if a node is re-inserted into the DOM by Angular before removal lands).
  const MARKED = "data-anghami-ad-removed";

  function removeAds() {
    if (!enabled) return;

    for (const selector of AD_SELECTORS) {
      try {
        document.querySelectorAll(selector).forEach((el) => {
          if (!el.hasAttribute(MARKED)) {
            el.setAttribute(MARKED, "1");
            el.remove();
            removedCount++;
          }
        });
      } catch (_) {
        // Malformed selector in edge cases — skip silently
      }
    }
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(removeAds);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // ── Initialise ──────────────────────────────────────────────────────────────

  chrome.storage.local.get([STORAGE_KEY], (result) => {
    enabled = result[STORAGE_KEY] !== false;
    if (enabled) {
      removeAds();
      startObserver();
    }
  });

  // ── Message handler (popup ↔ content script) ────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "getContentStats") {
      sendResponse({ removed: removedCount });
      return true;
    }

    if (message.type === "toggle") {
      enabled = message.enabled;
      if (enabled) {
        removeAds();
        startObserver();
      } else {
        stopObserver();
      }
      sendResponse({ ok: true });
      return true;
    }
  });
})();
