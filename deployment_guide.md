# 🚀 ExpenseFlow Deployment Guide

Taking your React Native app "live" means packaging it into secure release builds and submitting them to the storefronts. Here is the step-by-step process for both platforms.

---

## 🤖 Android: Publishing to Google Play Store

### A. Generate an Upload Key
You need a cryptographic key to sign your app. Run this in your terminal (Command Prompt/PowerShell):
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```
*(It will ask for a password. Keep this `.keystore` file extremely safe! If you lose it, you cannot push future updates to your app).*

### B. Configure Gradle Variables
1. Move the generated `my-upload-key.keystore` file into your `android/app` directory.
2. Open `android/gradle.properties` and add your password details at the bottom:
```properties
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=your_password_here
MYAPP_UPLOAD_KEY_PASSWORD=your_password_here
```

### C. Update build.gradle
Edit `android/app/build.gradle` to add the signing configuration so Gradle knows how to use your key:
```gradle
android {
    ...
    defaultConfig { ... }
    signingConfigs {
        debug { ... }
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release // Add this line!
        }
    }
}
```

### D. Generate the Release Bundle
Google Play requires an Android App Bundle (`.aab`) rather than an APK. Generate it by running:
```bash
cd android
./gradlew bundleRelease
```
Your bundle will be created at: `android/app/build/outputs/bundle/release/app-release.aab`.

### E. Upload to Play Console
1. Create a [Google Play Developer account](https://play.google.com/console/) ($25 one-time fee).
2. Create your app profile, fill out the Store Listing, and link a Privacy Policy URL.
3. Upload your `.aab` file to the **Production** or **Internal Testing** track to roll it out!

---

## 🍏 iOS: Publishing to Apple App Store
*Note: You MUST have an Apple Mac computer to build, sign, and publish iOS apps.*

### A. Apple Developer Account
Enroll in the [Apple Developer Program](https://developer.apple.com/) ($99/year).

### B. Update Xcode Settings
1. Open `ios/ExpenseFlow.xcworkspace` in Xcode.
2. Select the `ExpenseFlow` project in the left navigator.
3. Go to the **Signing & Capabilities** tab.
4. Check "Automatically manage signing" and select your Apple Developer Team.
5. Ensure your App Category and Bundle Identifier (e.g., `com.expenseflow`) are set.

### C. Create an Archive
1. In Xcode, select **Any iOS Device (arm64)** from the device dropdown at the top.
2. Go to the top menu bar: **Product > Archive**.
3. Xcode will bundle and compile the release version.

### D. Upload to App Store Connect
1. Once archiving finishes, the **Organizer** window will pop up.
2. Click **Distribute App** and follow the prompts.
3. Go to [App Store Connect](https://appstoreconnect.apple.com/), add your app screenshots, fill out the App Privacy questions, and submit it for Apple's review.

---

## 🛡️ Pre-Flight Checklist
Before throwing the app onto the store, do these three things:
- [ ] **Test the Release Build**: Debug builds hide lag. Test the production version on your phone exactly as users will experience it:
  - Android: `npm run android -- --mode=release`
- [ ] **Remote Database Check**: Ensure your Supabase URL and Keys in `.env` are pointing to your *production* Supabase project, not a temporary test database.
- [ ] **Privacy Policy**: Apple and Google rigorously enforce privacy. You must host a simple privacy policy webpage explaining that ExpenseFlow collects expense data.
