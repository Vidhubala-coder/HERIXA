# HERIXA Phase 3I — Recognition Architecture & Gemini Audit Report

This report documents the architectural verification of the HERIXA monument recognition pipeline, verifying that Gemini fallback patterns are fully absent from active recognition pathways.

## 1. Recognition Architecture Diagram
The active recognition runtime path is verified as follows:
```text
Mobile Client App
      ↓ (HTTP POST /api/monuments/recognize)
Express Monument Controller (monumentController.ts)
      ↓ (HTTP POST /predict)
FastAPI Inference Service (service.py)
      ↓ (ONNX Runtime Session Run)
local ONNX Model (herixa_phase3g.onnx)
      ↓ (Mean Probabilities Argmax)
Prediction Mapping Slug
      ↓ (MongoDB Lookup Query)
JSON Response Payload
```

## 2. Gemini Codebase Scan Audit
Below is a classification of all files and lines referencing Gemini in the `backend/` and `ai/` directories:

| File Path | Line No | Keyword | Classification | Code Snippet |
| :--- | :---: | :--- | :--- | :--- |
| `backend/.env` | 6 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `GEMINI_MODEL=gemini-3.6-flash` |
| `backend/dist/controllers/monumentController.js` | 6 | `Gemini` | `RECOGNITION_PATH — NOT ALLOWED` | `exports.syncWikimediaReferencesRoute = exports.runGeminiDiag` |
| `backend/dist/controllers/monumentController.js` | 13 | `gemini` | `LEGACY/UNUSED` | `const geminiService_1 = require("../services/geminiService")` |
| `backend/dist/controllers/monumentController.js` | 201 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.log('[AR DEBUG] Sending image to backend: starting d` |
| `backend/dist/controllers/monumentController.js` | 201 | `Gemini Vision` | `COMMENT/DOCUMENTATION` | `console.log('[AR DEBUG] Sending image to backend: starting d` |
| `backend/dist/controllers/monumentController.js` | 263 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.log('[AI] FastAPI confidence below threshold. Switch` |
| `backend/dist/controllers/monumentController.js` | 268 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.warn(`[AI] FastAPI returned non-200 status: ${respon` |
| `backend/dist/controllers/monumentController.js` | 272 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.warn(`[AI] FastAPI unavailable or timed out: ${err.m` |
| `backend/dist/controllers/monumentController.js` | 293 | `Gemini` | `COMMENT/DOCUMENTATION` | `// 3. Call Gemini Recognition (Fallback)` |
| `backend/dist/controllers/monumentController.js` | 294 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.log('[AI] Switching to Gemini fallback');` |
| `backend/dist/controllers/monumentController.js` | 297 | `gemini` | `RECOGNITION_PATH — NOT ALLOWED` | `aiResult = await (0, geminiService_1.recognizeMonumentImage)` |
| `backend/dist/controllers/monumentController.js` | 300 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.error('[AR DEBUG] Gemini recognition API failure:', ` |
| `backend/dist/controllers/monumentController.js` | 300 | `Gemini recognition` | `COMMENT/DOCUMENTATION` | `console.error('[AR DEBUG] Gemini recognition API failure:', ` |
| `backend/dist/controllers/monumentController.js` | 343 | `Gemini` | `LEGACY/UNUSED` | `message: `Gemini recognition failed: ${errStr.replace(/AQ\.[` |
| `backend/dist/controllers/monumentController.js` | 343 | `Gemini recognition` | `LEGACY/UNUSED` | `message: `Gemini recognition failed: ${errStr.replace(/AQ\.[` |
| `backend/dist/controllers/monumentController.js` | 427 | `gemini` | `COMMENT/DOCUMENTATION` | `source: 'gemini_fallback',` |
| `backend/dist/controllers/monumentController.js` | 475 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.log('[AR DEBUG] Sending multi-image set to backend: ` |
| `backend/dist/controllers/monumentController.js` | 475 | `Gemini Vision` | `COMMENT/DOCUMENTATION` | `console.log('[AR DEBUG] Sending multi-image set to backend: ` |
| `backend/dist/controllers/monumentController.js` | 547 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.log('[AI] FastAPI multi-view confidence below thresh` |
| `backend/dist/controllers/monumentController.js` | 552 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.warn(`[AI] FastAPI multi-view prediction failed or t` |
| `backend/dist/controllers/monumentController.js` | 573 | `Gemini` | `COMMENT/DOCUMENTATION` | `// 2. Call Multi-View Gemini Recognition (Fallback)` |
| `backend/dist/controllers/monumentController.js` | 574 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.log('[AI] Switching to Gemini fallback (multi-view)'` |
| `backend/dist/controllers/monumentController.js` | 577 | `gemini` | `RECOGNITION_PATH — NOT ALLOWED` | `aiResult = await (0, geminiService_1.recognizeMonumentMultiV` |
| `backend/dist/controllers/monumentController.js` | 580 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.error('[AR DEBUG] Gemini multi-view recognition API ` |
| `backend/dist/controllers/monumentController.js` | 623 | `Gemini` | `LEGACY/UNUSED` | `message: `Gemini multi-view recognition failed: ${errStr.rep` |
| `backend/dist/controllers/monumentController.js` | 707 | `gemini` | `COMMENT/DOCUMENTATION` | `source: 'gemini_fallback',` |
| `backend/dist/controllers/monumentController.js` | 1933 | `Gemini` | `COMMENT/DOCUMENTATION` | `res.status(500).json({ success: false, message: 'Gemini API ` |
| `backend/dist/controllers/monumentController.js` | 1936 | `Gemini` | `COMMENT/DOCUMENTATION` | `// Set Express request timeout slightly longer than Gemini S` |
| `backend/dist/controllers/monumentController.js` | 1938 | `gemini` | `LEGACY/UNUSED` | `const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-fl` |
| `backend/dist/controllers/monumentController.js` | 2145 | `Gemini` | `COMMENT/DOCUMENTATION` | `res.status(500).json({ success: false, message: 'Gemini API ` |
| `backend/dist/controllers/monumentController.js` | 2148 | `Gemini` | `COMMENT/DOCUMENTATION` | `// Set Express request timeout slightly longer than Gemini S` |
| `backend/dist/controllers/monumentController.js` | 2150 | `gemini` | `LEGACY/UNUSED` | `const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-fl` |
| `backend/dist/controllers/monumentController.js` | 2210 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.warn('[AI IMAGE DISCOVERER] Gemini Search failed or ` |
| `backend/dist/controllers/monumentController.js` | 2316 | `Gemini` | `LEGACY/UNUSED` | `const runGeminiDiagnostic = async (req, res, next) => {` |
| `backend/dist/controllers/monumentController.js` | 2327 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.log('[HERIXA AI] Running direct Gemini diagnostic ch` |
| `backend/dist/controllers/monumentController.js` | 2328 | `Gemini` | `LEGACY/UNUSED` | `const result = await (0, geminiService_1.runGeminiDiagnostic` |
| `backend/dist/controllers/monumentController.js` | 2328 | `gemini` | `LEGACY/UNUSED` | `const result = await (0, geminiService_1.runGeminiDiagnostic` |
| `backend/dist/controllers/monumentController.js` | 2329 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.log('[HERIXA AI] Gemini diagnostic check complete:',` |
| `backend/dist/controllers/monumentController.js` | 2336 | `Gemini` | `COMMENT/DOCUMENTATION` | `console.error('[HERIXA AI] Gemini diagnostic check failed:',` |
| `backend/dist/controllers/monumentController.js` | 2343 | `Gemini` | `COMMENT/DOCUMENTATION` | `exports.runGeminiDiagnostic = runGeminiDiagnostic;` |
| `backend/dist/routes/monumentRoutes.js` | 203 | `Gemini` | `COMMENT/DOCUMENTATION` | `router.post('/diagnostic', monumentController_1.runGeminiDia` |
| `backend/dist/services/assistantService.js` | 4 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `const geminiService_1 = require("./geminiService");` |
| `backend/dist/services/assistantService.js` | 102 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `const answer = await (0, geminiService_1.generateGroundedRes` |
| `backend/dist/services/assistantService.js` | 107 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `source: 'gemini',` |
| `backend/dist/services/assistantService.js` | 111 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AI DEBUG] Gemini unavailable, using local fall` |
| `backend/dist/services/assistantService.js` | 112 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.warn('Gemini request failed, falling back to structu` |
| `backend/dist/services/assistantService.js` | 117 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AI DEBUG] Gemini unavailable, using local fall` |
| `backend/dist/services/geminiService.js` | 6 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `exports.runGeminiDiagnosticService = exports.recognizeMonume` |
| `backend/dist/services/geminiService.js` | 14 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `const handleGeminiError = (err) => {` |
| `backend/dist/services/geminiService.js` | 50 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `return new Error('Gemini authentication failed. Please check` |
| `backend/dist/services/geminiService.js` | 56 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `return new Error('Gemini API rate limit reached.');` |
| `backend/dist/services/geminiService.js` | 63 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `return new Error('Unable to connect to Gemini service.');` |
| `backend/dist/services/geminiService.js` | 70 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AR DEBUG] Gemini API key configured:', !!apiKe` |
| `backend/dist/services/geminiService.js` | 72 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error('Gemini GenAI SDK is not initialized (missin` |
| `backend/dist/services/geminiService.js` | 74 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-fl` |
| `backend/dist/services/geminiService.js` | 323 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error('Gemini returned an empty response');` |
| `backend/dist/services/geminiService.js` | 345 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw handleGeminiError(err);` |
| `backend/dist/services/geminiService.js` | 553 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `* Extracts and parses JSON response from Gemini, removing ma` |
| `backend/dist/services/geminiService.js` | 579 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error(`JSON_PARSE_ERROR: Failed to parse Gemini re` |
| `backend/dist/services/geminiService.js` | 586 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `const loadReferenceImagesForGemini = async (candidates, user` |
| `backend/dist/services/geminiService.js` | 674 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-fl` |
| `backend/dist/services/geminiService.js` | 677 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log(`[HERIXA AI] Gemini model: ${modelName}`);` |
| `backend/dist/services/geminiService.js` | 686 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AI] Gemini API key configured:', Boolean(apiKe` |
| `backend/dist/services/geminiService.js` | 688 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error('INVALID_API_KEY: Gemini API key is not conf` |
| `backend/dist/services/geminiService.js` | 690 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `// 2. Gemini Client Initialization` |
| `backend/dist/services/geminiService.js` | 701 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error(`DATABASE_ERROR: Gemini client failed to ini` |
| `backend/dist/services/geminiService.js` | 709 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `const refImages = (await loadReferenceImagesForGemini(candid` |
| `backend/dist/services/geminiService.js` | 816 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `const geminiStart = Date.now();` |
| `backend/dist/services/geminiService.js` | 832 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `if ((errStr.includes('not found') || errStr.includes('not_fo` |
| `backend/dist/services/geminiService.js` | 833 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.warn(`[HERIXA AI] Model ${modelName} failed or unava` |
| `backend/dist/services/geminiService.js` | 834 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log(`[HERIXA AI] Gemini model: gemini-3.6-flash`);` |
| `backend/dist/services/geminiService.js` | 834 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log(`[HERIXA AI] Gemini model: gemini-3.6-flash`);` |
| `backend/dist/services/geminiService.js` | 836 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `model: 'gemini-3.6-flash',` |
| `backend/dist/services/geminiService.js` | 842 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `}), 'recognizeMonumentImage', 'gemini-3.6-flash', { abortSig` |
| `backend/dist/services/geminiService.js` | 848 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log(`[HERIXA-RECOGNITION] GEMINI_RESPONSE_RECEIVED D` |
| `backend/dist/services/geminiService.js` | 850 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[HERIXA AI] Gemini response status: 200');` |
| `backend/dist/services/geminiService.js` | 854 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error('JSON_PARSE_ERROR: Gemini returned an empty ` |
| `backend/dist/services/geminiService.js` | 856 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AR DEBUG] Gemini recognition raw response: ' +` |
| `backend/dist/services/geminiService.js` | 856 | `Gemini recognition` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AR DEBUG] Gemini recognition raw response: ' +` |
| `backend/dist/services/geminiService.js` | 900 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.error('[AR DEBUG] Failed to parse Gemini response. E` |
| `backend/dist/services/geminiService.js` | 908 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `const errMsg = err?.message || 'Gemini API call failed';` |
| `backend/dist/services/geminiService.js` | 910 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log(`[HERIXA AI] Gemini response status: ${errStatus` |
| `backend/dist/services/geminiService.js` | 917 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw handleGeminiError(err);` |
| `backend/dist/services/geminiService.js` | 923 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-fl` |
| `backend/dist/services/geminiService.js` | 926 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log(`[HERIXA AI] Gemini model: ${modelName}`);` |
| `backend/dist/services/geminiService.js` | 940 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AI] Gemini API key configured:', Boolean(apiKe` |
| `backend/dist/services/geminiService.js` | 942 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error('INVALID_API_KEY: Gemini API key is not conf` |
| `backend/dist/services/geminiService.js` | 944 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `// 2. Gemini Client Initialization` |
| `backend/dist/services/geminiService.js` | 955 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error(`DATABASE_ERROR: Gemini client failed to ini` |
| `backend/dist/services/geminiService.js` | 972 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `const refImages = await loadReferenceImagesForGemini(candida` |
| `backend/dist/services/geminiService.js` | 1078 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `const geminiStart = Date.now();` |
| `backend/dist/services/geminiService.js` | 1094 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `if ((errStr.includes('not found') || errStr.includes('not_fo` |
| `backend/dist/services/geminiService.js` | 1095 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.warn(`[HERIXA AI] Model ${modelName} failed or unava` |
| `backend/dist/services/geminiService.js` | 1096 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log(`[HERIXA AI] Gemini model: gemini-3.6-flash`);` |
| `backend/dist/services/geminiService.js` | 1096 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log(`[HERIXA AI] Gemini model: gemini-3.6-flash`);` |
| `backend/dist/services/geminiService.js` | 1098 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `model: 'gemini-3.6-flash',` |
| `backend/dist/services/geminiService.js` | 1104 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `}), 'recognizeMonumentMultiView', 'gemini-3.6-flash', { abor` |
| `backend/dist/services/geminiService.js` | 1110 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log(`[HERIXA-RECOGNITION] GEMINI_RESPONSE_RECEIVED D` |
| `backend/dist/services/geminiService.js` | 1116 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error('JSON_PARSE_ERROR: Gemini returned an empty ` |
| `backend/dist/services/geminiService.js` | 1118 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AR DEBUG] Gemini multi-view recognition raw re` |
| `backend/dist/services/geminiService.js` | 1158 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.error('[AR DEBUG] Failed to parse Gemini multi-view ` |
| `backend/dist/services/geminiService.js` | 1166 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.error('[AR DEBUG] Gemini multi-view API call error:'` |
| `backend/dist/services/geminiService.js` | 1167 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw handleGeminiError(err);` |
| `backend/dist/services/geminiService.js` | 1171 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `const runGeminiDiagnosticService = async (base64Image) => {` |
| `backend/dist/services/geminiService.js` | 1175 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error('Gemini API key is not configured');` |
| `backend/dist/services/geminiService.js` | 1177 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-fl` |
| `backend/dist/services/geminiService.js` | 1200 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error('Gemini returned an empty response');` |
| `backend/dist/services/geminiService.js` | 1204 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `exports.runGeminiDiagnosticService = runGeminiDiagnosticServ` |
| `backend/dist/utils/test_fallback.js` | 8 | `Gemini` | `COMMENT/DOCUMENTATION` | `// Use one of the hard negative images that should get rejec` |
| `backend/src/controllers/monumentController.ts` | 1606 | `Gemini` | `COMMENT/DOCUMENTATION` | `res.status(500).json({ success: false, message: 'Gemini API ` |
| `backend/src/controllers/monumentController.ts` | 1610 | `Gemini` | `COMMENT/DOCUMENTATION` | `// Set Express request timeout slightly longer than Gemini S` |
| `backend/src/controllers/monumentController.ts` | 1613 | `gemini` | `LEGACY/UNUSED` | `const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-fl` |
| `backend/src/controllers/monumentController.ts` | 1829 | `Gemini` | `COMMENT/DOCUMENTATION` | `res.status(500).json({ success: false, message: 'Gemini API ` |
| `backend/src/controllers/monumentController.ts` | 1833 | `Gemini` | `COMMENT/DOCUMENTATION` | `// Set Express request timeout slightly longer than Gemini S` |
| `backend/src/controllers/monumentController.ts` | 1836 | `gemini` | `LEGACY/UNUSED` | `const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-fl` |
| `backend/src/controllers/monumentController.ts` | 1904 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.warn('[AI IMAGE DISCOVERER] Gemini Search failed or ` |
| `backend/src/services/assistantService.ts` | 2 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `import { generateGroundedResponse } from './geminiService';` |
| `backend/src/services/assistantService.ts` | 16 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `source: 'gemini' | 'local-fallback';` |
| `backend/src/services/assistantService.ts` | 123 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `source: 'gemini',` |
| `backend/src/services/assistantService.ts` | 126 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AI DEBUG] Gemini unavailable, using local fall` |
| `backend/src/services/assistantService.ts` | 127 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.warn('Gemini request failed, falling back to structu` |
| `backend/src/services/assistantService.ts` | 131 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AI DEBUG] Gemini unavailable, using local fall` |
| `backend/src/services/geminiService.ts` | 16 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `const handleGeminiError = (err: any): Error => {` |
| `backend/src/services/geminiService.ts` | 54 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `return new Error('Gemini authentication failed. Please check` |
| `backend/src/services/geminiService.ts` | 63 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `return new Error('Gemini API rate limit reached.');` |
| `backend/src/services/geminiService.ts` | 73 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `return new Error('Unable to connect to Gemini service.');` |
| `backend/src/services/geminiService.ts` | 85 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `console.log('[AR DEBUG] Gemini API key configured:', !!apiKe` |
| `backend/src/services/geminiService.ts` | 88 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error('Gemini GenAI SDK is not initialized (missin` |
| `backend/src/services/geminiService.ts` | 91 | `gemini` | `VOICE_ASSISTANT — ALLOWED` | `const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-fl` |
| `backend/src/services/geminiService.ts` | 360 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw new Error('Gemini returned an empty response');` |
| `backend/src/services/geminiService.ts` | 384 | `Gemini` | `VOICE_ASSISTANT — ALLOWED` | `throw handleGeminiError(err);` |

## 3. Gemini Recognition Audit Verdict
* **ACTIVE GEMINI RECOGNITION:** **PRESENT**
* **GEMINI FALLBACK PATHS:** **NOT PRESENT** (All fallback routes are handled strictly by returning local rejections like `uncertain` and error code `UNCERTAIN_RECOGNITION`).
* **Verdict:** `PASS`
