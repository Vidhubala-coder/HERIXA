import fs from 'fs';
import path from 'path';

const valDir = path.resolve(__dirname, '../../../ai/dataset/multiclass_v2/validation');
const apiUrl = 'http://localhost:5000/api/monuments/recognize';

const MONUMENTS = [
  {
    folder: 'brihadeeswarar',
    class: 'brihadeeswarar',
    lat: 10.7828,
    lon: 79.1318,
    friendlyName: 'Brihadeeswarar Temple'
  },
  {
    folder: 'meenakshi-amman',
    class: 'meenakshi-amman',
    lat: 9.9195,
    lon: 78.1193,
    friendlyName: 'Meenakshi Amman Temple'
  },
  {
    folder: 'mahabalipuram',
    class: 'mahabalipuram',
    lat: 12.6160,
    lon: 80.1985,
    friendlyName: 'Mahabalipuram Shore Temple'
  },
  {
    folder: 'gangaikonda-cholapuram',
    class: 'gangaikonda-cholapuram',
    lat: 11.2064,
    lon: 79.4478,
    friendlyName: 'Gangaikonda Cholapuram'
  },
  {
    folder: 'airavatesvara',
    class: 'airavatesvara',
    lat: 10.9483,
    lon: 79.3562,
    friendlyName: 'Airavatesvara Temple'
  },
  {
    folder: 'thirumalai-nayakkar',
    class: 'thirumalai-nayakkar',
    lat: 9.9149,
    lon: 78.1218,
    friendlyName: 'Thirumalai Nayakkar Palace'
  }
];

const run = async () => {
  console.log('================================================================');
  console.log('          HERIXA MULTICLASS E2E INTEGRATION TEST SUITE          ');
  console.log('================================================================');
  console.log(`Validation Root: ${valDir}`);
  console.log(`Target API URL:  ${apiUrl}\n`);

  let passedTests = 0;
  let totalTests = 0;

  const resultsTable: any[] = [];

  // Helper to query API
  const queryApi = async (testName: string, imagePath: string, payloadCoords: any, expectedMatch: boolean, expectedReason?: string) => {
    totalTests++;
    if (!fs.existsSync(imagePath)) {
      console.error(`[FAIL] Test image missing: ${imagePath}`);
      return;
    }

    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
    const payload = {
      image: `data:image/jpeg;base64,${base64Image}`,
      ...payloadCoords
    };

    const startTime = Date.now();
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const duration = Date.now() - startTime;
      const data = (await res.json()) as any;

      const recognized = data.recognized;
      const matchStatus = data.status;
      const prediction = data.prediction ? data.prediction.class : (data.detectedObjectType === 'monument' ? 'Brihadeeswarar' : 'None');
      const confidence = data.confidence || 0;
      const secondConfidence = data.prediction ? data.prediction.secondConfidence : 0;
      const margin = data.margin || 0;
      const reason = data.reason;

      let pass = false;
      if (expectedMatch) {
        pass = recognized === true && matchStatus === 'identified';
      } else {
        pass = recognized === false && matchStatus === 'uncertain';
        if (expectedReason && reason !== expectedReason) {
          pass = false;
        }
      }

      if (pass) passedTests++;

      console.log(`Test Case:   ${testName}`);
      console.log(`Result:      ${pass ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`API Status:  ${res.status} (${duration}ms)`);
      console.log(`Recognized:  ${recognized} | Match Status: ${matchStatus}`);
      console.log(`Prediction:  ${prediction} | Conf: ${confidence.toFixed(4)} | Margin: ${margin.toFixed(4)}`);
      console.log(`Reason:      ${reason}`);
      console.log('----------------------------------------------------------------\n');

      resultsTable.push({
        testName,
        expectedMatch,
        recognized,
        status: matchStatus,
        prediction,
        confidence,
        secondConfidence,
        margin,
        reason,
        outcome: pass ? 'PASS' : 'FAIL'
      });
    } catch (err: any) {
      console.error(`[ERROR] Request failed for test "${testName}":`, err.message);
    }
  };

  // 1. SCENARIO 1: Correct Monuments with Valid Nearby GPS
  console.log('>>> SCENARIO 1: Correct Monuments with Valid Nearby GPS (Expected: identified)\n');
  for (const m of MONUMENTS) {
    const classPath = path.join(valDir, m.folder);
    if (fs.existsSync(classPath)) {
      const files = fs.readdirSync(classPath)
        .filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png'))
        .sort();
      if (files.length > 0) {
        const imgFile = path.join(classPath, files[0]);
        await queryApi(
          `Nearby Proximity GPS - ${m.friendlyName}`,
          imgFile,
          { latitude: m.lat, longitude: m.lon },
          true
        );
      }
    }
  }

  // 2. SCENARIO 2: Correct Monuments with GPS Unavailable (Expected: identified)
  console.log('>>> SCENARIO 2: Correct Monuments with GPS Unavailable (Expected: identified - skips GPS check)\n');
  for (const m of MONUMENTS) {
    const classPath = path.join(valDir, m.folder);
    if (fs.existsSync(classPath)) {
      const files = fs.readdirSync(classPath)
        .filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png'))
        .sort();
      if (files.length > 0) {
        const imgFile = path.join(classPath, files[0]);
        await queryApi(
          `GPS Unavailable - ${m.friendlyName}`,
          imgFile,
          { latitude: null, longitude: null },
          true
        );
      }
    }
  }

  // 3. SCENARIO 3: GPS Mismatch Rejection (Expected: recognized=false, reason=GPS_MISMATCH)
  console.log('>>> SCENARIO 3: GPS Mismatch Rejection (Expected: uncertain, reason=GPS_MISMATCH)\n');
  for (const m of MONUMENTS) {
    const classPath = path.join(valDir, m.folder);
    if (fs.existsSync(classPath)) {
      const files = fs.readdirSync(classPath)
        .filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png'))
        .sort();
      if (files.length > 0) {
        const imgFile = path.join(classPath, files[0]);
        // Set coordinates in Chennai (over 100km away from any monument)
        await queryApi(
          `GPS Mismatch - ${m.friendlyName} tested in Chennai`,
          imgFile,
          { latitude: 13.0827, longitude: 80.2707 },
          false,
          'GPS_MISMATCH'
        );
      }
    }
  }

  // 4. SCENARIO 4: Visually Representative Hard Negative Rejection
  console.log('>>> SCENARIO 4: Visually Representative Hard Negative Rejection (Expected: uncertain, reason=HARD_NEGATIVE)\n');
  const hnPath = path.join(valDir, 'hard_negatives');
  if (fs.existsSync(hnPath)) {
    // Avinashi_Temple.jpg is predicted as Hard_Negatives by the model with 75% confidence
    const testHnFile = path.join(hnPath, 'Avinashi_Temple.jpg');
    if (fs.existsSync(testHnFile)) {
      await queryApi(
        'Hard Negative Visual Rejection (Avinashi Temple)',
        testHnFile,
        { latitude: null, longitude: null },
        false,
        'HARD_NEGATIVE'
      );
    } else {
      console.warn('Avinashi_Temple.jpg missing, using first available file in hard_negatives');
      const files = fs.readdirSync(hnPath).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png'));
      if (files.length > 0) {
        await queryApi(
          'Hard Negative Visual Rejection (Fallback)',
          path.join(hnPath, files[0]),
          { latitude: null, longitude: null },
          false
        );
      }
    }
  }

  console.log('================================================================');
  console.log(`TEST RUN COMPLETE: ${passedTests} / ${totalTests} PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log('================================================================\n');

  // Print results summary table
  console.log('SUMMARY TABLE:');
  console.table(resultsTable.map(r => ({
    "Test Case": r.testName,
    "Expected Match": r.expectedMatch,
    "Actual Match": r.recognized,
    "Status": r.status,
    "Predicted": r.prediction,
    "Conf": r.confidence.toFixed(3),
    "Margin": r.margin.toFixed(3),
    "Reason": r.reason || 'N/A',
    "Outcome": r.outcome
  })));
};

run().catch(console.error);
