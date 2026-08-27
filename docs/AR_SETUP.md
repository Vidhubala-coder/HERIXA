# HeritageAR — AR Setup & Foundation Guide (Phase 3)

This document describes the AR (Augmented Reality) architecture foundation set up in Phase 3. It details current capabilities, configuration structures, camera permissions, Expo Go support details, and future integration paths for real 3D assets and image recognition tracking.

---

## Currently Implemented Architecture

Phase 3 introduces a modular, strongly typed AR subsystem segregated from standard screens.

```text
src/
├── ar/
│   ├── types.ts                   # ARState, MonumentARConfig types
│   ├── arConfig.ts                # Monument configuration registry
│   ├── arState.ts                 # useARState React hook for permission & scanner states
│   └── monumentRecognition.ts     # Abstraction boundary for future recognition engine
│
├── components/
│   └── ar/
│       ├── ARViewport.tsx         # expo-camera wrapper and permission UI handlers
│       ├── ARScannerOverlay.tsx   # Scanning grids and laser animation overlays
│       ├── ARGuidance.tsx         # Contextual directional instructional banners
│       ├── ARStatusBar.tsx        # Title bar & AR Mode Badge toggles
│       ├── ARMonumentInfo.tsx     # Reusable recognized monument details card (hidden)
│       └── ARBottomSheet.tsx      # Scanner instructions, preview notice & navigation sheet
```

### 1. SDK and Dependencies
* **Expo SDK Version**: `~57.0.11`
* **React Native Version**: `0.86.2`
* **Camera Module**: `expo-camera` (v57 compatible) installed via `npx expo install expo-camera`.

---

## AR State Workflow

Transitions between states are managed by `useARState` in `src/ar/arState.ts`:

```text
       [idle] (Initial state)
          ↓
  [initializing] (Checking / requesting permissions)
          ↓
     [scanning] (Camera active & scanning overlay running)
    /          \
[error]      [recognized / notRecognized] (Deferred for future engine integration)
```

1. **Permission Loading**: During camera initialization, the viewport renders a loading overlay.
2. **Permission Granted**: The scanner turns on the back camera feed (`CameraView`), starts the scanning laser animation, and shows the status bottom sheet.
3. **Permission Denied**: Displays a professional explanation screen with options to **Allow Camera Access** (retries request) or **Continue in Preview Mode**.
4. **Preview Mode**: Renders a dark, styled grid backdrop with static elements instead of the live feed, ensuring the app remains fully functional and never crashes on emulators or denied permissions.

---

## Recognition Boundary (Honest Mode)

In compliance with design principles, **no fake recognition success** is simulated.
* **`recognitionEnabled`** is set to `false` for all monuments in `src/ar/arConfig.ts`.
* **`recognizeMonument(...)`** in `src/ar/monumentRecognition.ts` always returns `available: false` and `monumentId: null`.
* **`ARMonumentInfo`** remains hidden unless valid recognition data exists.
* **`ARBottomSheet`** displays `AR Preview Mode - Real monument recognition is not available yet.` to keep the user clearly informed of current capabilities.

---

## Future Implementation & Integration Path

Once reference recognition assets and 3D models are ready, the application can be extended with a real AR engine.

### 1. AR Engine Options
* **ViroReact**: Ideal for React Native AR development. Supports image markers, AR portals, and 3D models. Requires an Expo Development Build (prebuild) as it uses native code.
* **Three.js + Expo-GL**: Cross-platform WebGL framework. Can run on top of standard Expo and supports custom shaders and complex GLB loader pipelines.
* **Expo-GL + Custom Shaders**: Best for low-overhead rendering directly onto the GPU.

### 2. Image Recognition Workflow
1. The camera scanner captures frame images (base64) when scanning.
2. The images are sent to the Express backend `/api/monuments/recognize` (single view) or `/api/monuments/recognize-multiview` (multi-view) endpoint.
3. The Express backend sends the captured image data to the local FastAPI inference service (`/predict`).
4. The FastAPI service processes the image through the custom-trained EfficientNet-B0 ONNX classification model.
5. If the prediction probability for a monument exceeds the decision threshold (e.g. `p_brihadeeswarar >= 0.300`), the monument is recognized and the predicted class name is used as the slug to fetch details from MongoDB.
6. The frontend receives the recognized monument details, transitions the scanner state to `recognized`, and renders the `ARMonumentInfo` action card.

### 3. 3D Model Workflow
1. 3D models (representing architectural scans, interactive dioramas, or reconstructions) will be generated.
2. Models must be compiled into native assets:
   * **Android**: `.glb` / `.gltf`
   * **iOS**: `.usdz`
3. Model URLs are set in `arModelUrl`, and type is mapped in `arModelType`.
4. When a monument is recognized, the system fetches the configuration via `arService.getARAsset(monumentId)`.
5. The model loader loads the asset asynchronously.
6. The AR viewport places the 3D model onto the recognized physical anchor coordinate, scaling it dynamically using `arScale`.
