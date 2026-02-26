# Omni Search

> **Search at the speed of thought.**

![Version](https://img.shields.io/badge/version-1.1-blue.svg) ![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg)

Omni Search is a powerful, native macOS Shortcut utility designed to eliminate the friction of context switching. It provides a centralized, persistent search window that intelligently routes your queries to the right tools—without cluttering your browser tabs.

---

## Why Omni Search?

- **🚀 Zero Friction**: Highlight text anywhere, trigger the shortcut, and get results instantly. No new tabs, no window hunting.
- **🛡️ Native Utility**: Built entirely on Apple Shortcuts and AppleScript. No third-party apps, no background daemons, no data logging.
- **🧠 Intelligent Routing**: Context-aware routing sends your search to Google, Apple Music, PubMed, or internal enterprise tools based on your selection.
- **🔒 Enterprise Ready**: Includes advanced URL sanitization to bypass strict WAFs (e.g., Apple Marketing Tools) and robust session handling for Safari restarts.

---

## Features

### Core Experience (v1.0)
- **Persistent Window**: Reuses a single, dedicated Safari window (Tab 1) to keep your workspace clean.
- **PID Tracking**: Intelligently tracks Safari's Process ID to handle application restarts without losing the search context.
- **Race Condition Handling**: optimized AppleScript logic ensures window creation and focus are instantaneous and bug-free.

### Advanced Capabilities (v1.1)
- **Auto-Updater**: Optional background checker that notifies you of new versions silently.
- **WAF Bypass**: Automatic URL encoding for specific domains to prevent 403 Forbidden errors on enterprise firewalls.
- **Hardened Session**: Improved window ID caching for maximum reliability.

---

## Installation

### Prerequisites
- macOS Monterey (12.0) or later.
- Safari (Default Browser).
- "Allow Running Scripts" enabled in Shortcuts preferences.

### Download
| Version | Description | Link |
| :--- | :--- | :--- |
| **v1.1** | **Latest Release.** Includes Auto-Updater & WAF Bypass. | [Download v1.1](https://www.icloud.com/shortcuts/3ccc02a9c79049bd8aa711228f5b5714) |
| **v1.0** | **Stable Release.** Core functionality only. Manual updates. | [Download v1.0](https://www.icloud.com/shortcuts/81f60aa121da4f99942250aef878808c) |

### Setup
1.  **Install the Shortcut**: Click one of the links above to add Omni Search to your Shortcuts app.
2.  **Assign a Hotkey**:
    *   Open Shortcuts.app.
    *   Right-click "Omni Search" -> "Add Keyboard Shortcut".
    *   Recommended: `Cmd + Shift + S` or `Option + Space`.
3.  **Grant Permissions**: On the first run, allow the shortcut to access Safari and System Events.

---

## Usage

1.  **Select Text**: Highlight any text in any application (Notes, Slack, PDF, etc.).
2.  **Trigger**: Press your assigned keyboard shortcut.
3.  **Search**: Safari instantly focuses the Omni Search window with your results.

*Note: If no text is selected, it can be configured to prompt for input.*

---

## Technical Details

The core logic relies on `AppleScript` for window management.

- **Window Management**: Uses `window id` and `unix id` to persist sessions.
- **Cache**: Stores session data in `/tmp/omnisearch_id.txt`.
- **Sanitization**: Form-encodes URLs for strict WAF compliance.

See [omnisearch_native.md](./omnisearch_native.md) for the full source code.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

*Built with ❤️ for macOS Power Users.*
