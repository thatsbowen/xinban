<div align="center">

<img src="assets/icon.png" width="128" height="128" alt="Xinban">

# Xinban · Your AI Companion

*A desktop AI soulmate — always online, always listening.*

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)](https://github.com/thatsbowen/xinban)
[![Electron](https://img.shields.io/badge/electron-30.x-47848F)](https://electronjs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Release](https://img.shields.io/badge/release-v1.0.0-FC60A8)](https://github.com/thatsbowen/xinban/releases)

[中文文档](README.md) | English

</div>

---

## Overview

**Xinban** (心伴, meaning "Heart Companion") is a desktop virtual companion app powered by large language models. Define a name, gender, age, and personality — and Xinban builds you a unique AI companion with a consistent personality, a custom avatar, and 24/7 proactive companionship.

Built on the [MiniMax Open Platform](https://platform.minimaxi.com), it leverages the MiniMax-M3 chat model and image-01 generation model — from character creation to daily conversation and scheduled check-ins, entirely AI-driven.

---

## Features

### Personalized Character Creation
Fill in 4 fields (Name / Gender / Age / Personality) and the system automatically builds a character backstory and generates a high-quality avatar image through the MiniMax API.

### Intelligent Conversation
Powered by MiniMax-M3, the character maintains a consistent personality across all conversations. Historical context (last 20 messages) is fed into each request, making every chat feel natural and contextual.

### Proactive Timed Interactions
| Trigger | Behavior |
|---------|----------|
| Every 10 minutes | "Wow, we've been talking for a while — need a break?" |
| Daily 08:00 / 18:00 | "Have you eaten yet? What did you have?" |
| Daily 12:30 | "Hmm... maybe time for a quick nap?" |
| Daily 22:00 | "Want to check tomorrow's weather?" |

### Local-First Data Storage
- All conversations stored locally as JSON
- Configuration + last 10 messages auto-synced to the LLM on startup
- View chat history offline anytime

### Tipping / Donation
- Donation popup appears on the 3rd app launch
- A persistent "Tip" button stays available in the bottom-right corner

---

## Screenshots

| Initialization | API Configuration | Main Chat | Donation |
|:---:|:---:|:---:|:---:|
| ![](screenshots/screenshot-init.png) | ![](screenshots/screenshot-config.png) | ![](screenshots/screenshot-main.png) | ![](screenshots/screenshot-donate.png) |

---

## Download

| Package | Size | Type |
|---------|------|------|
| [心伴-Setup-1.0.0.exe](https://github.com/thatsbowen/xinban/releases/download/v1.0.0/心伴-Setup-1.0.0.exe) | 79.8 MB | NSIS Installer (Windows) |
| [心伴-Portable-1.0.0.exe](https://github.com/thatsbowen/xinban/releases/download/v1.0.0/心伴-Portable-1.0.0.exe) | 72.5 MB | Portable (Windows, no install) |
| [心伴-1.0.0-x64.zip](https://github.com/thatsbowen/xinban/releases/download/v1.0.0/心伴-1.0.0-x64.zip) | 108 MB | Zip Archive (Windows) |

> **macOS users**: Build from source on a Mac — `npm run build:mac` generates a universal DMG (x64 + arm64).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron 30 |
| Bundler | electron-builder |
| Frontend | HTML5 / CSS3 / Vanilla JS |
| AI Models | MiniMax-M3 (chat), image-01 (image gen) |
| Image Processing | sharp |
| Storage | Local JSON filesystem |

---

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9

### Run Locally

```bash
git clone https://github.com/thatsbowen/xinban.git
cd xinban
npm install
npm start
```

### Get an API Key

1. Sign up at [platform.minimaxi.com](https://platform.minimaxi.com)
2. Top up **¥10** in your account
3. Create an API Key under "API Keys"
4. Paste the key into the app's configuration page

---

## Build

```bash
# Generate icons
npm run generate-icons

# Windows
npm run build:win:setup    # NSIS installer (.exe)
npm run build:win:portable  # Portable (.exe)

# macOS (must run on macOS)
npm run build:mac           # Universal DMG (x64 + arm64)
```

Output goes to `dist/`.

---

## Project Structure

```
xinban/
├── main.js                # Electron main process
├── preload.js             # Security IPC bridge
├── src/
│   ├── index.html         # SPA entry
│   ├── styles.css         # Global styles
│   └── renderer.js        # Renderer logic
├── assets/
│   ├── icon.svg           # Vector icon source
│   └── qrcode.jpg         # Default QR code for donations
├── screenshots/           # App screenshots
├── scripts/
│   └── generate-icons.js  # Icon generation
└── package.json           # Config & build scripts
```

---

## FAQ

**Q: Why do I need to top up ¥10?**
A: MiniMax requires a positive account balance to use the API. ¥10 lasts a very long time for personal use.

**Q: Is my data safe?**
A: Everything is stored locally — config, chat history, images. Nothing is uploaded to any server. The API key is used only for MiniMax API calls.

**Q: Can I change the avatar later?**
A: Not yet. Avatar regeneration is planned for a future release.

---

## License

MIT License © 2025

---

<div align="center">

*If this little companion brings you some warmth, consider treating the developer to a coffee ☕*

</div>
