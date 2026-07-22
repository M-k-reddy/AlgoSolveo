// Enable opening the side panel on action click (extension icon click)
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    if (chrome.sidePanel) {
      chrome.sidePanel
        .setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error("Error setting panel behavior:", error));
    }
  });
}

// Optional: listen for tab activation changes to let the sidepanel know it needs to refresh
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.runtime.sendMessage({
    type: "TAB_CHANGED",
    tabId: activeInfo.tabId
  }).catch(() => {
    // Ignore error if sidepanel is not open/listening yet
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Listen for both page load completion and URL changes (for LeetCode SPA routing)
  if ((changeInfo.status === "complete" || changeInfo.url) && tab.url && tab.url.includes("leetcode.com")) {
    chrome.runtime.sendMessage({
      type: "TAB_UPDATED",
      tabId: tabId,
      url: tab.url
    }).catch(() => {
      // Ignore error if sidepanel is not open/listening yet
    });
  }
});
