# HERIXA Phase 3I — Monument Recognition Error Propagation & Message Masking Fix Report

This report documents the root cause, implementation details, and verification results of the monument recognition error propagation fix.

---

## 1. Root Cause of Message Masking
Prior to this fix, the mobile application suffered from generic message masking where various technical errors (like connection timeouts, FastAPI service unavailability, or size limitations) were incorrectly displayed to the user as a low-confidence monument recognition error:
`Unable to confidently find this monument. Please scan the main temple structure from a clear angle.`

This happened because:
1. The Express backend did not consistently include the exact `errorDetails` classifier in successful or failed responses.
2. The frontend `monumentService.ts` did not support or parse the `errorDetails` property.
3. The mobile scanner interface `ARScannerScreen.tsx` hardcoded the generic low-confidence error message as a catch-all fallback for any non-successful prediction, without checking the specific nature of the error.

---

## 2. Backend Changes
We modified [monumentController.ts](file:///c:/Users/LENOVO/Desktop/AR%20model/backend/src/controllers/monumentController.ts) to correctly return detailed error classifiers:
- **Quality Check Failures:** Changed the single-view and multi-view quality check failures (e.g. invalid base64 formats or lengths) to return `errorDetails: 'INVALID_IMAGE'` instead of `'UNCERTAIN_RECOGNITION'`.
- **Low-Confidence Recognition:** For normal predictions where the confidence is below the threshold of `0.65`, the backend returns HTTP 200 with `recognized: false`, `status: 'uncertain'`, and includes `errorDetails: 'UNCERTAIN_RECOGNITION'`.

---

## 3. Frontend Changes
We modified [monumentService.ts](file:///c:/Users/LENOVO/Desktop/AR%20model/src/services/monumentService.ts) and [ARScannerScreen.tsx](file:///c:/Users/LENOVO/Desktop/AR%20model/src/screens/ARScannerScreen.tsx):
- **Service Type Interface:** Added `errorDetails?: string;` to `ImageRecognitionResponse`.
- **Error Extraction:** Updated catch blocks in `monumentService.ts` to propagate `err.responseBody?.errorDetails` (or map specific connection errors to `'NETWORK_ERROR'` or `'MODEL_UNAVAILABLE'`).
- **Centralized Helper:** Created `getFriendlyErrorMessage(errorDetails)` in `ARScannerScreen.tsx` to map each distinct category to its exact user-facing message.
- **View Updates:** Updated single-view and multi-view result handlers to pass `result.errorDetails` through the helper function to set the state error cleanly.

---

## 4. Centralized Error Mapping
The application now maps error classifiers as follows:

| Category | Description | Exact User-Facing Message |
| :--- | :--- | :--- |
| `UNCERTAIN_RECOGNITION` | Inference succeeded, confidence < 0.65 | `Unable to confidently identify this monument. Please scan the main temple structure from a clearer angle.` |
| `INVALID_IMAGE` | Image quality check failed | `The captured image is unclear or invalid. Please scan the monument from a clear angle.` |
| `IMAGE_TOO_LARGE` | Size exceeds 5MB limit | `Image size exceeds the maximum limit of 5MB. Please capture a lower-resolution image.` |
| `UNSUPPORTED_IMAGE_FORMAT` | Format is not JPG/PNG/WEBP | `Unsupported image format. Please use JPEG, JPG, PNG, or WEBP.` |
| `MODEL_UNAVAILABLE` | FastAPI service down | `HERIXA recognition service is temporarily unavailable. Please try again.` |
| `NETWORK_ERROR` | Device cannot reach backend | `Unable to connect to HERIXA server. Please check the backend connection and try again.` |
| `RECOGNITION_FAILED` | Process crashed or internal error | `Recognition request failed. Please try again.` |

---

## 5. Verification Results

### Automated Integration & Resilience Tests
Running the integration verification script:
```powershell
ai\.venv\Scripts\python.exe scratch/phase_3i_test_api.py
ai\.venv\Scripts\python.exe scratch/phase3i_resilience_perf_verify.py
```
- **Database Resolution Checks:** `PASS`
- **FastAPI Outage Simulation:** `PASS` (Returns HTTP 503 `MODEL_UNAVAILABLE`)
- **FastAPI Recovery Check:** `PASS` (Inference resumes with HTTP 200 after uvicorn is restarted)
- **Robust Error Checks:**
  - `INVALID_IMAGE` validation returns `INVALID_IMAGE` classifier: `PASS`
  - `IMAGE_TOO_LARGE` returns `IMAGE_TOO_LARGE` classifier: `PASS`
  - `UNSUPPORTED_IMAGE_FORMAT` returns `UNSUPPORTED_IMAGE_FORMAT` classifier: `PASS`

### Model/ONNX Integrity Checks
The SHA-256 hashes of the model weights and ONNX model were computed before and after implementation:
- **PyTorch Checkpoint (`best_model_multiclass_v2.pth`):**
  - Hash: `83852E65067C2F96E65084C650E8CAB8C22E572BC4D882563D95C33BB7644A0C`
  - Verdict: **UNMODIFIED** (`MODEL SAFETY: PASS`)
- **ONNX Model (`herixa_phase3g.onnx`):**
  - Hash: `1DCEAC122B0CABEB1B031D11D26E5CAF34F7869CC1EE17FFC14A77B8979393FE`
  - Verdict: **UNMODIFIED** (`ONNX SAFETY: PASS`)

---

## 6. Regression Testing Verdict
All existing features continue to work as expected:
- **Monument single-view & multi-view recognition:** **PASS** (Fused confidence/margins are intact).
- **Favorites & History:** **PASS** (History added on successful identification).
- **Gemini Voice Assistant:** **PRESERVED** (No modifications to unrelated features).
- **Gemini Monument Recognition/Fallback:** **ABSENT** (Model-only pipeline kept intact).
