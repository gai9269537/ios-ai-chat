# 💎 Coda AI: Premium Native iOS Workspace

Coda AI is a high-fidelity, private AI chat application designed for the "Sovereign Creator." It leverages **Capacitor** to deliver a premium, full-screen native iOS experience with haptic feedback, native system controls, and local-first data management.

---

## ✨ Key Native Features

- **📱 True Native iOS**: Built as a standalone iPhone app—no more browser flakiness or address bars.
- **📳 Haptic Engine**: Integrated native haptics provide physical feedback on messages, deletions, and workspace creations.
- **🏛️ Smart Workspaces**: Organize your intelligence into dynamic "Project Labs." 
- **🔒 Data Sovereignty**: Your chat history is stored **100% locally** on your device.
- **⚡ Proactive Tooling**: Context-aware chips and long-press refinement tools for rapid creative iteration.
- **🔑 BYOK Architecture**: Secure entry for your own Gemini API Key for total usage control.

---

## 🚀 Setting Up Your iOS Workspace

### Prerequisites 
- Node.js (v18+)
- Xcode (latest version)
- macOS (for iOS development)

### 🛠️ Early Ignition

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build and Sync iOS**
   ```bash
   npm run build:ios
   ```
   *This builds the web bundle and synchronizes it with the Xcode project.*

3. **Launch in Xcode**
   ```bash
   npm run open:ios
   ```

4. **Run on iPhone/Simulator**
   - In Xcode, select your destination (e.g., iPhone 16 Pro).
   - Press **Cmd + R** (Run).

---

## 📖 Available Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start web development server (legacy/testing). |
| `npm run build:ios` | **Recommend**: Build web assets and sync to iOS project. |
| `npm run open:ios` | Opens the native project in Xcode. |
| `npm run run:ios` | Attempts to build and run directly via CLI. |

---

## 🛠 Project Structure

- `App.tsx`: The core logic, now integrated with Capacitor plugins (Haptics, Dialogs, etc.).
- `ios/`: The native Xcode project folder.
- `assets/`: App icons and splash screens.

*Built for privacy. Designed for performance. Welcome to the Coda Core.*
