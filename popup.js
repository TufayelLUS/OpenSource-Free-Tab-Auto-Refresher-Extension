let countdownInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  const minSecondsInput = document.getElementById('minSeconds');
  const maxSecondsInput = document.getElementById('maxSeconds');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusCard = document.getElementById('statusCard');
  const currentUrlDiv = document.getElementById('currentUrl');
  const activeBadge = document.getElementById('activeBadge');
  
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab.url;
  currentUrlDiv.textContent = `📍 ${currentUrl.length > 60 ? currentUrl.substring(0, 60) + '...' : currentUrl}`;
  
  // Function to get random interval
  function getRandomInterval(minSeconds, maxSeconds) {
    const min = parseInt(minSeconds);
    const max = parseInt(maxSeconds);
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  
  // Function to update UI with timer
  function updateUI(isActive, timerInfo = null) {
    if (isActive && timerInfo && timerInfo.nextRefreshTime) {
      statusCard.className = 'status-card active';
      activeBadge.style.display = 'inline-block';
      
      const secondsLeft = Math.max(0, Math.floor((timerInfo.nextRefreshTime - Date.now()) / 1000));
      const displaySeconds = isNaN(secondsLeft) ? 0 : secondsLeft;
      
      statusCard.innerHTML = `
        <div>✅ <strong>ACTIVE</strong></div>
        <div class="countdown-large" id="liveCountdown">${displaySeconds}s</div>
        <div>until next refresh</div>
        <div class="timerange-info">
          🔄 Random range: ${timerInfo.minSeconds} - ${timerInfo.maxSeconds} seconds
          ${timerInfo.currentInterval ? `<br>🎲 Current interval: ${timerInfo.currentInterval} seconds` : ''}
        </div>
        <div class="timerange-info" style="margin-top: 5px; background: #28a745; color: white;">
          💾 Settings saved for this page<br>
          🔄 Timer gets NEW random time on every page load!
        </div>
      `;
      
      // Update countdown every second
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(() => {
        if (timerInfo.nextRefreshTime) {
          const newSecondsLeft = Math.max(0, Math.floor((timerInfo.nextRefreshTime - Date.now()) / 1000));
          const countdownElement = document.getElementById('liveCountdown');
          if (countdownElement) {
            const safeSeconds = isNaN(newSecondsLeft) ? 0 : newSecondsLeft;
            countdownElement.textContent = `${safeSeconds}s`;
            if (safeSeconds <= 5 && safeSeconds > 0) {
              countdownElement.style.color = '#ff5722';
              countdownElement.style.animation = 'pulse 1s infinite';
            } else {
              countdownElement.style.color = '#155724';
              countdownElement.style.animation = 'none';
            }
          }
        }
      }, 1000);
    } else {
      statusCard.className = 'status-card inactive';
      activeBadge.style.display = 'none';
      statusCard.innerHTML = '<div>⚫ <strong>Not Active</strong></div><div>Click Start to begin auto-refresh</div><div class="timerange-info" style="margin-top: 8px;">💡 Timer gets NEW random time on every page refresh!</div>';
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }
  }
  
  // Load saved settings
  try {
    const settingsResponse = await chrome.runtime.sendMessage({ 
      action: 'getSettingsForUrl', 
      url: currentUrl 
    });
    
    if (settingsResponse && settingsResponse.settings) {
      minSecondsInput.value = settingsResponse.settings.minSeconds;
      maxSecondsInput.value = settingsResponse.settings.maxSeconds;
      console.log('Loaded saved settings:', settingsResponse.settings);
    } else {
      // Set default values
      minSecondsInput.value = 5;
      maxSecondsInput.value = 10;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    minSecondsInput.value = 5;
    maxSecondsInput.value = 10;
  }
  
  // Check current status
  try {
    const statusResponse = await chrome.runtime.sendMessage({ 
      action: 'getStatus', 
      tabId: tab.id 
    });
    
    if (statusResponse && statusResponse.isActive && statusResponse.nextRefreshTime) {
      updateUI(true, statusResponse);
    } else {
      updateUI(false);
    }
  } catch (error) {
    console.error('Error checking status:', error);
    updateUI(false);
  }
  
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'refreshStarted' && message.tabId === tab.id) {
      updateUI(true, message);
    } else if (message.action === 'refreshStopped' && message.tabId === tab.id) {
      updateUI(false);
    }
  });
  
  // Start button
  startBtn.addEventListener('click', async () => {
    const minSeconds = parseInt(minSecondsInput.value);
    const maxSeconds = parseInt(maxSecondsInput.value);
    
    // Validation
    if (isNaN(minSeconds) || minSeconds < 1) {
      alert('Please enter a valid minimum seconds (minimum 1)');
      return;
    }
    
    if (isNaN(maxSeconds) || maxSeconds < 1) {
      alert('Please enter a valid maximum seconds (minimum 1)');
      return;
    }
    
    if (minSeconds > maxSeconds) {
      alert('Minimum seconds cannot be greater than maximum seconds');
      return;
    }
    
    // Calculate first interval IMMEDIATELY
    const firstInterval = getRandomInterval(minSeconds, maxSeconds);
    const nextRefreshTime = Date.now() + (firstInterval * 1000);
    
    // Show timer IMMEDIATELY in UI
    updateUI(true, {
      nextRefreshTime: nextRefreshTime,
      minSeconds: minSeconds,
      maxSeconds: maxSeconds,
      currentInterval: firstInterval
    });
    
    // Also update badge immediately
    chrome.action.setBadgeText({ text: firstInterval.toString(), tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tab.id });
    
    // Send message to background
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'startRefresh',
        url: currentUrl,
        tabId: tab.id,
        minSeconds: minSeconds,
        maxSeconds: maxSeconds
      });
      
      if (!response || !response.success) {
        updateUI(false);
        chrome.action.setBadgeText({ text: '', tabId: tab.id });
        alert('Failed to start auto-refresh');
      }
    } catch (error) {
      console.error('Error starting refresh:', error);
      updateUI(false);
      chrome.action.setBadgeText({ text: '', tabId: tab.id });
      alert('Failed to start auto-refresh');
    }
  });
  
  // Stop button
  stopBtn.addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'stopRefresh',
        tabId: tab.id
      });
      
      if (response && response.success) {
        updateUI(false);
      }
    } catch (error) {
      console.error('Error stopping refresh:', error);
    }
  });
});

// Add animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
  }
`;
document.head.appendChild(style);