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

