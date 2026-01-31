I've completed a comprehensive review of the iOS AI Chat repository. Based on the documentation and code analysis, here are the complete documents to help Gemini build an Apple App Store-ready MVP:

***

## 📋 PRODUCT REQUIREMENTS DOCUMENT (PRD)

### **Product Name:** Coda AI - Native iOS AI Chat Application

### **1. EXECUTIVE SUMMARY**

**Product Vision:** A premium, privacy-first AI chat application for iOS that provides users with a native mobile experience for conversing with Google's Gemini AI models. The app emphasizes data sovereignty (100% local storage), native iOS integration, and a premium user experience. [github](https://github.com/gai9269537/ios-ai-chat/blob/main/README.md)

**Target Users:** "Sovereign Creators" - professionals, developers, and power users who value privacy, data control, and premium user experiences. [github](https://github.com/gai9269537/ios-ai-chat/blob/main/README.md)

**Core Value Proposition:**
- True native iOS experience with haptic feedback and system integration
- 100% local data storage - no cloud storage of conversations
- BYOK (Bring Your Own Key) architecture for API key control
- Smart workspace organization for different contexts
- Voice input integration for hands-free operation

***

### **2. TECHNICAL ARCHITECTURE**

**Tech Stack (from package.json):** [github](https://github.com/gai9269537/ios-ai-chat/blob/main/package.json)
- **Framework:** React 19.2.4 with TypeScript 5.8.2
- **Build Tool:** Vite 6.2.0
- **Native Bridge:** Capacitor 8.0.2 (iOS wrapper)
- **Capacitor Plugins:**
  - @capacitor/core
  - @capacitor/device
  - @capacitor/dialog
  - @capacitor/haptics
  - @capacitor/ios
  - @capacitor/keyboard
  - @capacitor/status-bar
- **AI Integration:** Google Gemini API (^1.39.0)
- **UI Framework:** React DOM 19.2.4

**Bundle ID:** `com.coda.ai.pro` [github](https://github.com/gai9269537/ios-ai-chat/blob/main/APP_STORE_SUBMISSION.md)

**Development Requirements:** [github](https://github.com/gai9269537/ios-ai-chat/blob/main/README.md)
- Node.js v18+
- Xcode (latest version)
- macOS for iOS development
- Active Apple Developer Program membership ($99/year)

***

### **3. CORE FEATURES & REQUIREMENTS**

#### **3.1 AI Chat Functionality**
**Priority:** P0 (Critical)

**Requirements:**
- Integration with Google Gemini API for AI responses
- Support for two model variants:
  - Gemini Flash (fast responses)
  - Gemini Pro (deep reasoning)
- Streaming responses with real-time display
- Message history persistence in local storage
- Context-aware conversations with message history

**Technical Notes:** [github](https://github.com/gai9269537/ios-ai-chat/blob/main/services/gemini.ts)
- API key stored in local storage with key: `ios_ai_chat_sessions_v1`
- System instruction: "You are a professional AI assistant. Keep responses extremely concise and helpful for mobile users. Use bullet points."
- Error handling for missing API keys

***

#### **3.2 Workspace Management**
**Priority:** P0 (Critical)

**Requirements:**
- Four default project categories (Labs):
  - 🛠️ Work (blue-50)
  - 💡 Ideas (purple-50)
  - 💻 Dev (zinc-800)
  - 🏃 Life (orange-50)
- Create new chat sessions within workspaces
- Organize conversations by context/project
- Horizontal category picker for workspace selection
- Edit mode for managing workspaces:
  - Reorder workspaces
  - Delete workspaces
  - Rename labs

**Storage Key:** `ios_ai_chat_projects_v1` [github](https://github.com/gai9269537/ios-ai-chat/blob/main/App.tsx)

***

#### **3.3 Native iOS Integration**
**Priority:** P0 (Critical)

**Requirements:**
- **Haptic Feedback:** [github](https://github.com/gai9269537/ios-ai-chat/blob/main/USER_GUIDE.md)
  - Message send confirmation
  - Workspace creation/deletion
  - Lab identification
  - Button interactions
  
- **Native Dialogs:**
  - System alerts for confirmations
  - Replace web alerts with iOS native dialogs
  
- **Safe Area Handling:**
  - Respect iPhone notches and home indicators
  - Proper padding for edge-to-edge design
  
- **Keyboard Management:**
  - Auto-adjust layout when keyboard appears
  - Keep conversation visible during typing
  
- **Status Bar:**
  - Native iOS status bar styling

***

#### **3.4 Voice Input**
**Priority:** P1 (High)

**Requirements:**
- Speech-to-text functionality for hands-free input
- Microphone button in chat interface
- Native iOS speech recognition integration
- Privacy: Speech Recognition permission in Info.plist [github](https://github.com/gai9269537/ios-ai-chat/blob/main/APP_STORE_SUBMISSION.md)

**Info.plist Requirements:**
```xml
<key>NSSpeechRecognitionUsageDescription</key>
<string>We use speech recognition to enable voice input for AI conversations.</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access for voice-to-text functionality.</string>
```

***

#### **3.5 Data Privacy & Security**
**Priority:** P0 (Critical)

**Requirements:**
- 100% local storage - no server-side data persistence
- User provides own Gemini API key (BYOK architecture)
- API key stored securely in iOS local storage
- Encryption exemption configured (no custom encryption) [github](https://github.com/gai9269537/ios-ai-chat/blob/main/APP_STORE_SUBMISSION.md)
- Clear privacy policy stating data handling practices

**Info.plist Configuration:** [github](https://github.com/gai9269537/ios-ai-chat/blob/main/APP_STORE_SUBMISSION.md)
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

***

#### **3.6 User Interface Requirements**
**Priority:** P0 (Critical)

**Design System:**
- Premium glassmorphism effects
- Typography: Outfit font (primary), Inter font (secondary)
- Brand-driven color palette
- Full-screen immersive experience
- Smooth animations and transitions
- Custom splash screen with Coda AI logo and pulsing animation [github](https://github.com/gai9269537/ios-ai-chat/blob/main/APP_STORE_SUBMISSION.md)

**UI Components:**
- Message bubbles with user/AI distinction
- Status bar showing current workspace
- Compose button for new sessions
- Edit mode toggle
- Model selector (Flash/Pro)
- Voice input button
- Export functionality for conversations

***

#### **3.7 Usage Limits & Management**
**Priority:** P1 (High)

**Requirements:**
- Free tier: 20 chats per day limit
- Display remaining credits
- Usage counter stored locally
- Reset counter daily
- Clear messaging when limit reached

***

### **4. APPLE APP STORE COMPLIANCE**

#### **4.1 Mandatory Requirements** [github](https://github.com/gai9269537/ios-ai-chat/blob/main/APP_STORE_SUBMISSION.md)

**App Store Connect Setup:**
- Bundle ID: `com.coda.ai.pro`
- App name: Coda AI
- Category: Productivity
- Content rating: 4+

**Required URLs:**
- Privacy Policy (hosted externally)
- Support URL (contact/help page)

**App Icon:**
- 1024x1024px high-resolution icon
- All required size variants for iOS

**Screenshots Required:**
- 6.7" (iPhone 16 Pro Max)
- 6.5" (iPhone 11 Pro Max, XS Max)
- 5.5" (iPhone 8 Plus)

***

#### **4.2 Compliance Checklist** [github](https://github.com/gai9269537/ios-ai-chat/blob/main/APP_STORE_SUBMISSION.md)

✅ **Required:**
- Info.plist privacy descriptions (Speech Recognition, Microphone)
- Encryption exemption declaration
- Privacy policy addressing data handling
- No hidden features
- Accessible UI (contrast, readable fonts)

❌ **NOT Required:**
- Sign in with Apple (no account system)
- App Tracking Transparency (no tracking/ads)
- In-app purchases (free app with BYOK)

***

#### **4.3 Privacy Policy Template** [github](https://github.com/gai9269537/ios-ai-chat/blob/main/APP_STORE_SUBMISSION.md)

```
Coda AI Privacy Policy

Local Sovereignty:
All chat history is stored 100% locally on your device. We do not store your data on our servers.

Processing Transparency:
Messages are sent to Google's Gemini API for processing. Your data is handled according to Google's Privacy Policy during this exchange.

Zero Third-Party Tracking:
We do not track users, sell data, or use invasive analytics.

API Key Security:
Your Gemini API key is stored securely in your device's local storage and never transmitted to our servers.

Voice Input:
Speech recognition is processed on-device or by Apple's services, depending on your iOS settings.

Data Collection:
We collect no personal information. Usage statistics (chat counts) are stored locally only.
```

***

### **5. USER FLOWS**

#### **5.1 First Launch Flow**
1. App launches with splash screen
2. Welcome screen explains BYOK concept
3. User enters Gemini API key
4. API key validated and stored locally
5. Default workspaces created
6. User lands on empty chat in "Work" workspace

#### **5.2 Chat Creation Flow**
1. User taps compose icon
2. Selects workspace category (Work/Ideas/Dev/Life)
3. New chat session created
4. Cursor focuses on input field
5. User types or speaks message
6. Haptic feedback on send
7. AI streams response
8. Message saved to local storage

#### **5.3 Workspace Management Flow**
1. User taps "Edit" button
2. UI switches to edit mode
3. User can:
   - Drag to reorder workspaces
   - Tap delete icon to remove
   - Tap to rename
4. Native dialog confirms destructive actions
5. Changes persist to local storage
6. Haptic feedback on actions

***

### **6. SUCCESS METRICS**

**App Store Approval:**
- Pass App Store review on first submission
- No privacy or policy violations
- No technical rejections

**User Experience:**
- < 2 second app launch time
- < 1 second AI response start (streaming)
- Zero data loss incidents
- Native feel rated 5/5 by test users

**Performance:**
- App size < 50MB
- Memory usage < 100MB during normal use
- No crashes in production

***

## 🎨 DESIGN SPECIFICATIONS

### **1. VISUAL DESIGN SYSTEM**

#### **Typography**
- **Primary Font:** Outfit (headers, labels)
- **Secondary Font:** Inter (body text, messages)
- **Sizes:**
  - H1: 32px (bold)
  - H2: 24px (semibold)
  - Body: 16px (regular)
  - Caption: 14px (regular)

#### **Color Palette**
- **Primary Blue:** `bg-blue-50` (Work category)
- **Purple:** `bg-purple-50` (Ideas category)
- **Zinc:** `bg-zinc-800` (Dev category)
- **Orange:** `bg-orange-50` (Life category)
- **Glassmorphism:** Semi-transparent backgrounds with blur effects
- **Text:** High contrast for accessibility

#### **Spacing System**
- Base unit: 4px
- Small: 8px
- Medium: 16px
- Large: 24px
- Extra large: 32px

***

### **2. COMPONENT SPECIFICATIONS**

#### **Message Bubble**
- User messages: Right-aligned, blue background
- AI messages: Left-aligned, gray background
- Border radius: 16px
- Padding: 12px 16px
- Max width: 80% of screen width
- Markdown support for formatting

#### **Workspace Picker**
- Horizontal scrollable picker
- Category cards: 80px width
- Icon + label layout
- Active state: Border highlight
- Smooth scroll animation

#### **Input Bar**
- Fixed bottom position
- Safe area padding
- Voice button (left)
- Text input (center, expanding)
- Send button (right)
- Auto-grows up to 4 lines

#### **Splash Screen**
- Centered Coda AI logo
- Pulsing animation (scale 1.0 → 1.1)
- Background: Brand gradient
- Duration: 1.5 seconds

***

### **3. INTERACTION PATTERNS**

#### **Haptic Feedback Types**
- **Impact Light:** Button taps
- **Impact Medium:** Message send
- **Impact Heavy:** Delete actions
- **Selection:** Workspace switching
- **Notification Success:** API key validated

#### **Animations**
- Message appear: Fade in + slide up (200ms)
- Workspace switch: Fade transition (150ms)
- Keyboard show: Smooth bottom padding (250ms)
- Loading spinner: Continuous rotation

***

### **4. RESPONSIVE LAYOUT**

#### **iPhone Size Support**
- iPhone SE: 375px width
- iPhone 16: 393px width
- iPhone 16 Pro: 430px width
- iPhone 16 Pro Max: 440px width

#### **Safe Area Handling**
- Top inset: Status bar + notch
- Bottom inset: Home indicator
- Dynamic padding adjustment
- Test on all notch variants

***

## 🤖 GEMINI PROMPTS FOR MVP DEVELOPMENT

Below are the prompts you should provide to Gemini in sequence to build the MVP:

***

### **PROMPT 1: Project Setup**

```
Create a new React + TypeScript + Vite project for an iOS AI chat application called "Coda AI". 

Setup requirements:
1. Use Vite as the build tool with React 19.2.4 and TypeScript 5.8.2
2. Install and configure Capacitor 8.0.2 for iOS native wrapper
3. Add the following Capacitor plugins:
   - @capacitor/core
   - @capacitor/device
   - @capacitor/dialog
   - @capacitor/haptics
   - @capacitor/ios
   - @capacitor/keyboard
   - @capacitor/status-bar
4. Install @google/generative-ai version ^1.39.0 for Gemini API integration
5. Install @types/node version ^22.14.0 for TypeScript support

Configure package.json with these scripts:
- "dev": "vite"
- "build": "vite build"
- "preview": "vite preview"
- "build:ios": "npm run build && npx cap sync ios"
- "open:ios": "npx cap open ios"
- "run:ios": "npm run build && npx cap run ios"

Create capacitor.config.ts with:
- appId: "com.coda.ai.pro"
- appName: "Coda AI"
- webDir: "dist"
- Bundle version: 0.0.0

Provide the complete folder structure and all configuration files.
```

***

### **PROMPT 2: iOS Native Configuration**

```
Configure the iOS native layer for Coda AI to pass Apple App Store review:

1. Create/update Info.plist with:
   - NSSpeechRecognitionUsageDescription: "We use speech recognition to enable voice input for AI conversations."
   - NSMicrophoneUsageDescription: "We need microphone access for voice-to-text functionality."
   - ITSAppUsesNonExemptEncryption: false
   - Proper display name and bundle identifier

2. Configure iOS safe area handling for:
   - iPhone notches (X, 11, 12, 13, 14, 15, 16 series)
   - Home indicator padding
   - Status bar visibility

3. Set up the iOS splash screen with:
   - Background color matching app theme
   - Coda AI logo centered
   - Support for all iPhone screen sizes

4. Configure status bar style to work with the app's glassmorphism design

Provide all necessary iOS configuration files and explain where each file should be placed in the project structure.
```

***

### **PROMPT 3: Data Models and Storage**

```
Create TypeScript types and local storage management for Coda AI:

1. Define these TypeScript interfaces in types.ts:
   - Message: { role: 'user' | 'model', content: string, timestamp: Date }
   - ChatSession: { id: string, projectId: string, messages: Message[], title: string, lastUpdated: Date }
   - Project: { id: string, name: string, emoji: string, color: string }
   - ModelName: enum with 'GEMINI_FLASH' and 'GEMINI_PRO'

2. Create a local storage service (services/storage.ts) with functions:
   - getSessions(): ChatSession[]
   - saveSessions(sessions: ChatSession[]): void
   - getProjects(): Project[]
   - saveProjects(projects: Project[]): void
   - getApiKey(): string | null
   - setApiKey(key: string): void
   - getSelectedModel(): ModelName
   