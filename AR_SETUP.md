# HERIXA — Phase 5 AR Setup and Architecture Documentation

This document explains the AR setup, requirements, architecture, and fallback mechanisms for the **HERIXA** application.

---

## 1. Environment & Dependency Versions

- **Expo SDK Version:** `~57.0.12`
- **React Native Version:** `0.86.2`
- **React Version:** `19.2.3`
- **Viro AR Library:** `@reactvision/react-viro` (`^2.57.5` compatible with Expo SDK 57 and React Native 0.86)

---

## 2. Double Runtime Modes (Safety Core)

To support both standard development workflows and native testing, the application isolates Viro components and executes in one of two paths based on runtime capability:

### MODE A — Expo Go (Static Preview Fallback)
- **Environment:** Launched using standard `npx expo start -c` and opened in the Expo Go application.
- **Viro Safety:** Expo Go does not contain custom native modules, so `@reactvision/react-viro` is isolated. We use `ARNativeViewportLoader` to perform a dynamic runtime `require` of the Viro components only when a native environment is verified. This ensures the Viro codebase is never evaluated during startup in Expo Go, resolving the `setJSAnimations of null` crash.
- **Behavior:** The app runs the standard camera stream using `<CameraView>` from `expo-camera`.
- **UI Feedback:** Displays `PREVIEW MODE` in the top header and details explaining that a native development build is required for full AR overlays.
- **Recognition:** Simulated scanning runs but correctly reports no match found (it does not fake recognition).

### MODE B — Android/iOS Development Build (Real AR)
- **Environment:** Run using native prebuild commands (`npx expo prebuild` and `npx expo run:android`).
- **Behavior:** Dynamically detects the presence of the native `ViroARSceneNavigator` view manager.
- **Initialization:** Requests camera permissions, initializes the native AR session, registers image targets dynamically, and streams tracking anchors.
- **Features:** 3D monument objects are placed on top of recognized image markers and adjust scale, position, and rotation.

---

## 3. Dynamic Capability Detection

The capability checker in `src/ar/arCapabilities.ts` evaluates the environment on mount using a three-tier gate:
1. **Platform Compatibility:** Verifies the app is running on a physical Android or iOS device (Web/Simulators are rejected and fall back to Preview).
2. **Native Module Availability:** Checks if `UIManager.getViewManagerConfig('ViroARSceneNavigator')` exists.
3. **Camera Permission Status:** Checks if permissions are granted.

The system maps the runtime state to one of the following strongly-typed statuses:
- `preview`: Viro native components are missing (Expo Go fallback).
- `nativeARAvailable`: Native Viro modules are present.
- `unsupported`: Platform is unsupported (Simulators / Web).
- `permissionDenied`: Camera permissions are missing.
- `initializing`: AR engine is booting.
- `scanning`: Camera feed is active and searching for image targets.
- `recognized`: Target image detected; 3D model rendering.
- `targetLost`: Target image lost from view; returning to scanning.
- `modelLoading`: 3D model is downloading.
- `modelError`: 3D model download/parsing failure.
- `error`: General initialization or capture failure.

---

## 4. AR Asset Configurations & Safety

### Image Recognition Targets (`referenceImages.ts`)
We register tracking targets using `ViroARTrackingTargets.createTargets`. To prevent fake recognition and placeholder errors:
- **Brihadeeswarar Temple** is set up with Wikipedia's official image of the temple for the recognition target.
- **3D Model Availability:** Since no verified direct-download 3D model of the temple is available, `arModelUrl` is set to empty/null. When recognized, the card explicitly displays `"3D Monument Model Unavailable"`.
- **Other Monuments** remain disabled (`recognitionEnabled: false` or `arEnabled: false`) until verified assets are added.

---

## 5. Hotspot & LAN Network Debugging for Physical Devices

When debugging the app on a physical phone connected to your laptop's Wi-Fi hotspot or local network, loopback (`localhost` or `127.0.0.1`) will fail. You must configure the LAN IP.

### Step 1: Find your Laptop's Hotspot/LAN IP
1. Open PowerShell or Command Prompt.
2. Run the command:
   ```bash
   ipconfig
   ```
3. Locate the active network adapter (e.g. *Wireless LAN adapter Wi-Fi* or *Wireless LAN adapter Local Area Connection*).
4. Copy the **IPv4 Address** (typically looks like `192.168.137.1` or `192.168.1.X`).

### Step 2: Configure Environment Variables
1. Edit the `.env` file in the root directory.
2. Replace `localhost` with your laptop's IP address:
   ```bash
   EXPO_PUBLIC_API_URL=http://YOUR_LAPTOP_IP:5000
   EXPO_PUBLIC_GUEST_USER_ID=6a7a70eb677209d21b1bb799
   ```

> [!NOTE]
> During regression auditing, the active system local Wi-Fi IPv4 address was verified to be: **`10.138.205.241`**.
> You can configure: `EXPO_PUBLIC_API_URL=http://10.138.205.241:5000` inside your root `.env` file.

### Step 3: Windows Firewall Access Setup
If your phone is unable to reach the API server, the Windows Defender Firewall might be blocking incoming traffic on port 5000.
To allow incoming traffic on port 5000:
1. Open PowerShell as Administrator.
2. Propose and run the following command to add a port exception rule:
   ```powershell
   New-NetFirewallRule -DisplayName "HERIXA Backend Port 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
   ```

---

## 6. Execution & Seeding Commands

### 1. Database Setup
Ensure MongoDB is running, then seed the database:
```bash
cd backend
npm run seed
```

### 2. Launch Backend
```bash
cd backend
npm run dev
```

### 3. Launch Frontend (Metro)
```bash
npx expo start -c
```

---

## 7. Troubleshooting & Limitations

- **Camera Permission Denied:** If permission is denied, the app displays a custom permission screen with options to retry or proceed in static Preview Mode.
- **3D Model Unavailable:** If the monument is recognized but has no 3D asset, it displays "3D Monument Model Unavailable" in the details panel instead of rendering placeholder assets (like a lantern).
- **Simulator Crashes:** AR scenes will not load on simulators. They will fall back to static Preview Mode automatically.
