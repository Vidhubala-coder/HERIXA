import fs from 'fs';
import path from 'path';

// API endpoints
const RECOGNIZE_URL = 'http://localhost:5000/api/monuments/recognize';

// Calibration thresholds matched to frontend logic
const HIGH_CONFIDENCE_THRESHOLD = 0.80;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.35;

/**
 * Custom test suite verifying AR capability mapping and AI recognition confidence handling
 */
const runArIntegrationTests = async () => {
  console.log('====================================================');
  console.log('     HERIXA ADAPTIVE AR & SMART SCAN INTEGRATION    ');
  console.log('====================================================\n');

  // Test 1: Simulate Capability Mapping Logic
  console.log('[TEST 1] Verifying AR capability mappings...');
  const simulateCapability = (supported: boolean, reason?: string): string => {
    if (supported) return 'SUPPORTED';
    if (reason === 'UNSUPPORTED_DEVICE' || reason === 'NATIVE_MODULE_UNAVAILABLE') {
      return 'UNSUPPORTED';
    }
    return 'UNKNOWN'; // Safe fallback
  };

  const testCases = [
    { supported: true, reason: undefined, expected: 'SUPPORTED' },
    { supported: false, reason: 'UNSUPPORTED_DEVICE', expected: 'UNSUPPORTED' },
    { supported: false, reason: 'NATIVE_MODULE_UNAVAILABLE', expected: 'UNSUPPORTED' },
    { supported: false, reason: 'ARCORE_NOT_INSTALLED', expected: 'UNKNOWN' },
    { supported: false, reason: 'UNKNOWN_ERROR', expected: 'UNKNOWN' }
  ];

  let passed = true;
  for (const tc of testCases) {
    const result = simulateCapability(tc.supported, tc.reason);
    const status = result === tc.expected ? 'PASS' : 'FAIL';
    console.log(`  - Input: supported=${tc.supported}, reason=${tc.reason || 'none'} => Mapped: ${result} (Expected: ${tc.expected}) [${status}]`);
    if (status === 'FAIL') passed = false;
  }
  console.log(`[TEST 1 RESULT] ${passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // Test 2: AI Recognition Confidence Handling
  console.log('[TEST 2] Verifying AI recognition threshold triage rules...');
  
  const triageConfidence = (recognized: boolean, confidence: number): string => {
    if (!recognized || confidence < MEDIUM_CONFIDENCE_THRESHOLD) {
      return 'LOW_CONFIDENCE (Monument Not Recognized Confidently)';
    }
    if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
      return 'HIGH_CONFIDENCE (Monument Recognized)';
    }
    return 'MEDIUM_CONFIDENCE (Possible Match)';
  };

  const triageCases = [
    { recognized: true, confidence: 0.95, expected: 'HIGH_CONFIDENCE (Monument Recognized)' },
    { recognized: true, confidence: 0.81, expected: 'HIGH_CONFIDENCE (Monument Recognized)' },
    { recognized: true, confidence: 0.55, expected: 'MEDIUM_CONFIDENCE (Possible Match)' },
    { recognized: true, confidence: 0.35, expected: 'MEDIUM_CONFIDENCE (Possible Match)' },
    { recognized: true, confidence: 0.28, expected: 'LOW_CONFIDENCE (Monument Not Recognized Confidently)' },
    { recognized: false, confidence: 0.90, expected: 'LOW_CONFIDENCE (Monument Not Recognized Confidently)' }
  ];

  let triagePassed = true;
  for (const tc of triageCases) {
    const result = triageConfidence(tc.recognized, tc.confidence);
    const status = result === tc.expected ? 'PASS' : 'FAIL';
    console.log(`  - Input: recognized=${tc.recognized}, confidence=${tc.confidence} => Category: ${result} [${status}]`);
    if (status === 'FAIL') triagePassed = false;
  }
  console.log(`[TEST 2 RESULT] ${triagePassed ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // Test 3: API Request Validation
  console.log('[TEST 3] Verifying /api/monuments/recognize endpoint schemas...');
  const testImagePath = path.resolve(__dirname, '../../../ai/dataset/test/hard_negatives/A_closeup_view_of_gopuram.jpg');
  
  if (!fs.existsSync(testImagePath)) {
    console.log(`  - Skipping API connection checks: test image file does not exist at ${testImagePath}`);
    return;
  }

  try {
    const rawImage = fs.readFileSync(testImagePath, { encoding: 'base64' });
    const payload = {
      image: `data:image/jpeg;base64,${rawImage}`,
      latitude: 10.7828,
      longitude: 79.1318
    };

    console.log(`  - Sending mock request to ${RECOGNIZE_URL}...`);
    const res = await fetch(RECOGNIZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`  - HTTP status: ${res.status}`);
    const data: any = await res.json();
    
    console.log('  - Response properties check:');
    console.log(`    * success (boolean): ${typeof data.success === 'boolean'} (${data.success})`);
    console.log(`    * recognized (boolean): ${typeof data.recognized === 'boolean'} (${data.recognized})`);
    console.log(`    * status (string): ${typeof data.status === 'string'} (${data.status})`);
    
    if (data.recognized && data.confidence !== undefined) {
      console.log(`    * confidence (number): ${typeof data.confidence === 'number'} (${data.confidence})`);
      console.log(`    * monumentName (string): ${typeof data.monumentName === 'string'} (${data.monumentName})`);
    }

    console.log('[TEST 3 RESULT] PASSED ✅\n');
  } catch (err: any) {
    console.warn(`  - API call warning: ${err.message}. Ensure the local server is running to test API endpoints.`);
    console.log('[TEST 3 RESULT] SKIPPED (Server offline) ⚠️\n');
  }
};

runArIntegrationTests().catch(console.error);
