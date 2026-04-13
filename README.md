# Auto Refresh Chrome Extension

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue.svg)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.2-green.svg)](https://github.com/yourusername/auto-refresh-extension/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Chrome extension that automatically refreshes web pages at customizable random intervals with persistent settings per page.

## 📸 At A Glance

[![Screenshot](https://raw.githubusercontent.com/TufayelLUS/Opensource-Free-Tab-Auto-Refresher/refs/heads/main/ss.png)](https://raw.githubusercontent.com/TufayelLUS/Opensource-Free-Tab-Auto-Refresher/refs/heads/main/ss.png)

## ✨ Features

- **🎲 Random Refresh Intervals**: Set minimum and maximum seconds for random refresh timing
- **💾 Persistent Settings**: Settings are automatically saved per URL and persist across browser sessions
- **🔄 Auto-Restart**: Automatically restarts refresh when navigating back to a page with saved settings
- **⏱️ Live Countdown**: Real-time countdown timer displayed on the extension icon badge
- **🎨 Beautiful UI**: Clean, modern popup interface with status indicators
- **🔒 Secure**: Only refreshes pages you explicitly enable, with proper permission handling

## 🚀 Installation

### From Chrome Web Store (Recommended)

Not available yet!

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will be installed and ready to use

## 📖 Usage

1. **Navigate to any webpage** you want to auto-refresh
2. **Click the extension icon** in your browser toolbar
3. **Set your refresh interval range** (minimum and maximum seconds)
4. **Click "Start Auto Refresh"** - the countdown begins immediately!
5. **Watch the live countdown** on the extension badge
6. **Settings are automatically saved** for this page

### Key Features in Action:

- **Random Timing**: Each refresh uses a new random interval within your specified range
- **Persistent**: Return to the page later - auto-refresh will restart automatically
- **Visual Feedback**: Green badge shows countdown, red when nearing refresh
- **Easy Control**: Start/stop with one click, settings remembered per page

## 🔧 How It Works

### Architecture Overview

The extension consists of four main components:

#### `manifest.json`

- Defines extension metadata, permissions, and entry points
- Uses Manifest V3 for modern Chrome extension standards
- Configures popup UI and background service worker

#### `background.js` (Service Worker)

The brain of the extension that handles:

- **Settings Management**: Stores refresh settings per URL using Chrome's local storage
- **Alarm Scheduling**: Uses Chrome alarms API for reliable timing
- **Badge Updates**: Displays live countdown on extension icon
- **Tab Monitoring**: Detects page changes and manages refresh cycles
- **Message Handling**: Communicates with popup for real-time updates

#### `popup.html` & `popup.js`

- **User Interface**: Clean, responsive popup with input controls
- **Real-time Status**: Shows current refresh state and countdown
- **Settings Persistence**: Loads and saves per-URL configurations
- **Validation**: Ensures valid input ranges and provides user feedback

### Refresh Cycle Flow

1. User sets min/max seconds and clicks "Start"
2. Extension generates random interval within range
3. Alarm is scheduled for the refresh time
4. Badge displays countdown timer
5. When alarm triggers, page refreshes
6. New random interval generated for next cycle
7. Process repeats until stopped

### Data Persistence

- Settings stored per base URL (protocol + domain + path)
- Survives browser restarts and tab closures
- Automatically reapplies when returning to saved pages

## 🔐 Permissions

The extension requires the following permissions (all standard for refresh functionality):

- `activeTab`: Access current tab for refresh operations
- `storage`: Save settings locally
- `tabs`: Monitor tab changes and updates
- `scripting`: Execute refresh scripts
- `alarms`: Schedule refresh timers
- `host_permissions`: `<all_urls>` - Only used for pages you explicitly enable

## 🛠️ Development

### Prerequisites

- Chrome browser
- Basic understanding of JavaScript and Chrome Extensions

### Local Development

1. Clone the repository
2. Enable Developer Mode in `chrome://extensions/`
3. Load the extension as described in Installation
4. Make changes and reload the extension

### File Structure

```
auto-refresh-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker logic
├── popup.html            # Extension popup UI
├── popup.js              # Popup interaction logic
└── README.md             # This file
```

### Key Functions

#### Background Script (`background.js`)

- `startRefresh()`: Initiates refresh cycle with random interval
- `stopRefresh()`: Completely removes settings and stops timers
- `updateBadge()`: Updates extension icon with countdown
- `getRandomInterval()`: Generates random time within user range

#### Popup Script (`popup.js`)

- `updateUI()`: Refreshes popup display with current status
- Message listeners for real-time background updates
- Input validation and user interaction handling

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have suggestions:

- Open an issue on GitHub
- Check the console for error messages
- Ensure you're using a recent version of Chrome

## 🙏 Acknowledgments

- Built with Chrome Extension Manifest V3
- Uses modern JavaScript async/await patterns
- Inspired by the need for reliable page refresh automation

---

**Made with ❤️ for developers and power users who need automated page refreshing. Contact me to develop custom chrome extensions if you wish.**
