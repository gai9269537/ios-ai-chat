# 💎 Coda AI: Premium Proactive Workspace

Coda AI is a high-fidelity, private AI chat application designed for the "Sovereign Creator." It combines a premium iOS-style glassmorphism interface with local-first data management and multi-project support.

---

## ✨ Key Features

- **🏛️ Smart Workspaces**: Organize your intelligence into dynamic "Project Labs". Add, rename, or remove categories to suit your evolving workflow.
- **🎤 Voice Activation**: Fully integrated speech-to-text for proactive, hands-free task creation.
- **🔒 Data Sovereignty**: Your chat history is stored **100% locally** on your device.
- **⚡ Proactive Tooling**: Long-press messages to refine, expand, or humanize text instantly.
- **🛠️ Chat Management**: Effortlessly reorder, edit, and delete your workspaces.
- **🔑 Bring Your Own Key (BYOK)**: Secure entry for your own Gemini API Key for total usage control.

---

## 🚀 Setting Up Your Workspace

### Prerequisites 
- Node.js (v18+)
- npm

### 🛠️ Installation

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Configure Environment** (Optional - you can also enter your key inside the app)
   Create a `.env.local` file and add:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   ```

3. **Ignition**
   ```bash
   npm run dev
   ```
   *The app will automatically start at [http://localhost:3000](http://localhost:3000)*

---

## 📱 Mobile Deployment (Capacitor)

Coda AI is built to be deployed as a native iOS app.

1. **Build the Web Asset**
   ```bash
   npm run build
   ```

2. **Sync with iOS**
   ```bash
   npx cap sync ios
   ```

3. **Open in Xcode**
   ```bash
   npx cap open ios
   ```

---

*Built for privacy. Designed for performance. Welcome to the Coda Core.*
