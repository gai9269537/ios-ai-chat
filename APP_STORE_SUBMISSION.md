# App Store Submission Guide: Coda AI

This document outlines the steps taken and the remaining requirements to submit **Coda AI** to the Apple App Store.

## 🛠 What has been done
1. **Capacitor Integration**: The web app has been wrapped in a native iOS container using Capacitor.
2. **Platform Configuration**: Initialized iOS platform in the `ios/` directory.
3. **Info.plist Compliance**: Added mandatory privacy usage descriptions for Speech Recognition and Microphone access.
4. **Encryption Exemption**: Configured the app to specify it does not use non-exempt encryption (simplifies submission).
5. **Premium Branding**: 
   - **Logo**: A high-end 1024x1024 app icon (`app_icon.png`) has been generated and applied.
   - **Splash Screen**: A native-style splash screen with the Coda AI logo and pulsing animation.
   - **Design System**: Fully implemented glassmorphism, premium typography (Outfit/Inter), and a brand-driven color palette.

## 🚀 Next Steps (Action Required)

### 1. Apple Developer Account
- You must have an active **Apple Developer Program** membership ($99/year).
- Enroll at [developer.apple.com](https://developer.apple.com).

### 2. App Store Connect
- Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com).
- Create a **New App**.
- Use the Bundle ID: `com.coda.ai.pro`.

### 3. Finalize Assets (Xcode)
Open the project in Xcode:
```bash
npx cap open ios
```
- **App Icon**: Drag the generated `app_icon.png` into `App > App > Assets.xcassets > AppIcon`. (You may need to resize it for various slots, or use a tool like [IconGenerator](https://appicon.co)).
- **Signing**: In the "Signing & Capabilities" tab, select your Development Team.

### 4. Mandatory Submission URLS
You will need to provide these in App Store Connect:
- **Privacy Policy**: (Example template provided below).
- **Support URL**: A simple page where users can contact you.

### 5. Privacy Policy Template
You can host this on a simple GitHub Page or your website:
> **Coda AI Privacy Policy**
> - **Coda Core Privacy**: We do not store your chat data on our servers.
> - **Local Sovereignty**: All chat history is stored 100% locally on your device.
> - **Processing**: Speech data is processed by Apple's built-in speech recognition and Google's Gemini API.
> - **Zero Tracking**: We do not track users, sell data to third parties, or use analytics that identify individuals.

## 📝 Compliance Checklist
- [ ] **No Hidden Features**: The app matches its description.
- [ ] **Sign in with Apple**: NOT REQUIRED (since the app has no account registration).
- [ ] **App Tracking Transparency**: NOT REQUIRED (unless you add ads or tracking later).
- [ ] **Accessibility**: UI elements use appropriate contrasting colors and readable font sizes.

## 📦 Building for Production
When ready to upload:
1. `npm run build`
2. `npx cap copy ios`
3. In Xcode, change destination to "Any iOS Device (arm64)".
4. Product > Archive.
5. Distribute App > App Store Connect.
