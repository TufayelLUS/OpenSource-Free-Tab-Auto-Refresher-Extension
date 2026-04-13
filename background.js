// Store settings per URL
let urlSettings = new Map();

// Track countdown intervals per tab
let countdownIntervals = new Map();

// Load settings on startup
async function loadSettings() {
  const result = await chrome.storage.local.get(["urlRefreshSettings"]);
  if (result.urlRefreshSettings) {
    urlSettings = new Map(Object.entries(result.urlRefreshSettings));
    console.log("Loaded settings:", Array.from(urlSettings.entries()));
  }
}

// Save settings
async function saveSettings() {
  const settingsObj = Object.fromEntries(urlSettings);
  await chrome.storage.local.set({ urlRefreshSettings: settingsObj });
  console.log("Saved settings:", Array.from(urlSettings.entries()));
}

// Get base URL
function getBaseUrl(url) {
  try {
    if (
      !url ||
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://")
    ) {
      return null;
    }
    const urlObj = new URL(url);
    return urlObj.origin + urlObj.pathname;
  } catch (e) {
    return null;
  }
}

// Update badge
function updateBadge(tabId, secondsLeft) {
  if (secondsLeft !== null && secondsLeft > 0 && !isNaN(secondsLeft)) {
    const text = secondsLeft <= 999 ? secondsLeft.toString() : "999+";
    chrome.action.setBadgeText({ text: text, tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50", tabId: tabId });
  } else {
    chrome.action.setBadgeText({ text: "", tabId: tabId });
  }
}

// Get random interval
function getRandomInterval(minSeconds, maxSeconds) {
  const min = parseInt(minSeconds);
  const max = parseInt(maxSeconds);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Start countdown timer for badge
function startBadgeCountdown(tabId, nextRefreshTime) {
  // Clear any existing countdown for this tab
  if (countdownIntervals.has(tabId)) {
    clearInterval(countdownIntervals.get(tabId));
  }

  // Update badge immediately
  const secondsLeft = Math.max(
    0,
    Math.floor((nextRefreshTime - Date.now()) / 1000),
  );
  updateBadge(tabId, secondsLeft);

  // Set up interval to update every second
  const interval = setInterval(() => {
    const remaining = Math.max(
      0,
      Math.floor((nextRefreshTime - Date.now()) / 1000),
    );
    updateBadge(tabId, remaining);

    // Clear interval when countdown reaches 0
    if (remaining <= 0) {
      clearInterval(interval);
      countdownIntervals.delete(tabId);
    }
  }, 1000);

  // Store the interval ID to clear it later
  countdownIntervals.set(tabId, interval);
}

// Start refresh for a tab
async function startRefresh(tabId, url, minSeconds, maxSeconds) {
  const baseUrl = getBaseUrl(url);
  if (!baseUrl) return false;

  // Generate random interval
  const newInterval = getRandomInterval(minSeconds, maxSeconds);
  const nextRefreshTime = Date.now() + newInterval * 1000;

  console.log(
    `Starting refresh for tab ${tabId}, URL: ${baseUrl}, interval: ${newInterval}s (range: ${minSeconds}-${maxSeconds}s)`,
  );

  // Save settings with enabled flag
  urlSettings.set(baseUrl, { minSeconds, maxSeconds, enabled: true });
  await saveSettings();

  // Clear any existing alarm for this tab
  const alarmName = `refresh_${tabId}`;
  await chrome.alarms.clear(alarmName);

  // Create new alarm
  chrome.alarms.create(alarmName, {
    delayInMinutes: newInterval / 60,
  });

  // Store tab info
  await chrome.storage.local.set({
    [`tab_${tabId}`]: {
      url: baseUrl,
      minSeconds: minSeconds,
      maxSeconds: maxSeconds,
      nextRefresh: nextRefreshTime,
      currentInterval: newInterval,
    },
  });

  // Start countdown timer for badge
  startBadgeCountdown(tabId, nextRefreshTime);

  // Send update to popup
  chrome.runtime
    .sendMessage({
      action: "refreshStarted",
      tabId,
      url: baseUrl,
      minSeconds: minSeconds,
      maxSeconds: maxSeconds,
      nextRefresh: nextRefreshTime,
      currentInterval: newInterval,
    })
    .catch(() => {});

  return true;
}

// Stop refresh for a tab (completely remove settings)
async function stopRefresh(tabId) {
  console.log(`Stopping refresh for tab ${tabId}`);

  // Clear alarm
  const alarmName = `refresh_${tabId}`;
  await chrome.alarms.clear(alarmName);
  // Clear countdown interval
  if (countdownIntervals.has(tabId)) {
    clearInterval(countdownIntervals.get(tabId));
    countdownIntervals.delete(tabId);
  }
  updateBadge(tabId, null);

  // Get the current tab URL to remove its settings
  try {
    const tab = await chrome.tabs.get(tabId);
    const baseUrl = getBaseUrl(tab.url);

    if (baseUrl) {
      // COMPLETELY REMOVE settings for this URL
      const hadSettings = urlSettings.has(baseUrl);
      urlSettings.delete(baseUrl);
      if (hadSettings) {
        console.log(`Removed settings for ${baseUrl}`);
        await saveSettings();
      }
    }
  } catch (error) {
    console.error("Error getting tab URL:", error);
  }

  // Remove stored tab info
  await chrome.storage.local.remove([`tab_${tabId}`]);

  chrome.runtime
    .sendMessage({
      action: "refreshStopped",
      tabId,
    })
    .catch(() => {});
}

// Handle alarm (refresh trigger)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith("refresh_")) {
    const tabId = parseInt(alarm.name.split("_")[1]);

    console.log(`Alarm triggered for tab ${tabId}`);

    try {
      // Get tab info
      const result = await chrome.storage.local.get([`tab_${tabId}`]);
      const tabInfo = result[`tab_${tabId}`];

      if (!tabInfo) {
        console.log(`No info found for tab ${tabId}`);
        return;
      }

      // Get the tab
      const tab = await chrome.tabs.get(tabId);
      const currentBaseUrl = getBaseUrl(tab.url);

      // Check if still on same page AND settings still exist
      const settingsExist = urlSettings.has(currentBaseUrl);

      if (currentBaseUrl === tabInfo.url && settingsExist) {
        console.log(`Refreshing tab ${tabId}`);

        // Store the settings before refresh
        const settings = {
          minSeconds: tabInfo.minSeconds,
          maxSeconds: tabInfo.maxSeconds,
        };

        // Refresh the tab
        await chrome.tabs.reload(tabId);

        // After refresh, restart with NEW random interval ONLY if settings still exist
        setTimeout(async () => {
          try {
            const refreshedTab = await chrome.tabs.get(tabId);
            if (refreshedTab && refreshedTab.url) {
              // Check if settings still exist for this URL
              const stillEnabled = urlSettings.has(
                getBaseUrl(refreshedTab.url),
              );
              if (stillEnabled) {
                console.log(
                  `Restarting refresh after reload with NEW random interval`,
                );
                await startRefresh(
                  tabId,
                  refreshedTab.url,
                  settings.minSeconds,
                  settings.maxSeconds,
                );
              } else {
                console.log(`Settings were removed, not restarting`);
              }
            }
          } catch (e) {
            console.error("Error restarting after refresh:", e);
          }
        }, 2000);
      } else {
        console.log(
          `URL changed or settings removed, stopping refresh for tab ${tabId}`,
        );
        await stopRefresh(tabId);
      }
    } catch (error) {
      console.error(`Error refreshing tab ${tabId}:`, error);
      if (error.message.includes("No tab with id")) {
        await stopRefresh(tabId);
      }
    }
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // When page finishes loading
  if (changeInfo.status === "complete" && tab.url) {
    const baseUrl = getBaseUrl(tab.url);
    console.log(`Tab ${tabId} finished loading: ${baseUrl}`);

    if (!baseUrl) return;

    // Check if this URL has saved settings AND they are enabled
    if (urlSettings.has(baseUrl)) {
      const settings = urlSettings.get(baseUrl);

      // Only restart if settings exist and we're not in the middle of a refresh cycle
      const existingAlarm = await chrome.alarms.get(`refresh_${tabId}`);
      const tabInfo = await chrome.storage.local.get([`tab_${tabId}`]);

      // If no active alarm OR this is a manual refresh (we can check if the stored URL matches)
      if (
        !existingAlarm ||
        !tabInfo[`tab_${tabId}`] ||
        tabInfo[`tab_${tabId}`].url !== baseUrl
      ) {
        console.log(
          `Starting/restarting refresh for ${baseUrl} with NEW random interval`,
        );
        await startRefresh(
          tabId,
          tab.url,
          settings.minSeconds,
          settings.maxSeconds,
        );
      }
    }
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener(async (tabId) => {
  console.log(`Tab ${tabId} removed`);
  await stopRefresh(tabId);
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === "startRefresh") {
        const success = await startRefresh(
          request.tabId,
          request.url,
          request.minSeconds,
          request.maxSeconds,
        );
        sendResponse({ success: success });
      } else if (request.action === "stopRefresh") {
        await stopRefresh(request.tabId);
        sendResponse({ success: true });
      } else if (request.action === "getStatus") {
        const result = await chrome.storage.local.get([`tab_${request.tabId}`]);
        const tabInfo = result[`tab_${request.tabId}`];
        const alarm = await chrome.alarms.get(`refresh_${request.tabId}`);

        sendResponse({
          isActive: !!alarm,
          nextRefreshTime: tabInfo?.nextRefresh || null,
          minSeconds: tabInfo?.minSeconds || null,
          maxSeconds: tabInfo?.maxSeconds || null,
          currentInterval: tabInfo?.currentInterval || null,
        });
      } else if (request.action === "getSettingsForUrl") {
        const baseUrl = getBaseUrl(request.url);
        const settings = baseUrl ? urlSettings.get(baseUrl) : null;
        sendResponse({ settings: settings || null });
      } else {
        sendResponse({ error: "Unknown action" });
      }
    } catch (error) {
      console.error("Message handler error:", error);
      sendResponse({ error: error.message });
    }
  })();

  return true;
});

// Initialize
(async () => {
  await loadSettings();
  console.log("Extension initialized");
})();
