import fs from 'fs';
import path from 'path';

// Use one of the hard negative images that should be rejected by the local trained model without fallback
const testImageFile = path.resolve(__dirname, '../../../ai/dataset/test/hard_negatives/A_closeup_view_of_gopuram.jpg');
const apiUrl = 'http://localhost:5000/api/monuments/recognize';

const run = async () => {
  console.log('Reading test image:', testImageFile);
  if (!fs.existsSync(testImageFile)) {
    console.error('Test image does not exist!');
    return;
  }

  const base64Image = fs.readFileSync(testImageFile, { encoding: 'base64' });
  const payload = {
    image: `data:image/jpeg;base64,${base64Image}`,
    latitude: 10.7828,
    longitude: 79.1318,
  };

  console.log('Sending request to', apiUrl);
  const startTime = Date.now();
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;
    console.log(`Response status: ${res.status} (${duration}ms)`);
    const data: any = await res.json();
    
    // Print normalized validation response keys only
    console.log('\nINTEGRATION RESPONSE METRICS:');
    console.log('------------------------------');
    console.log('Success:', data.success);
    console.log('Recognized:', data.recognized);
    console.log('Status:', data.status);
    console.log('Source:', data.source);
    console.log('MonumentName:', data.monumentName);
    console.log('Confidence:', data.confidence);
    console.log('Reason:', data.reason);
    console.log('------------------------------');
  } catch (err: any) {
    console.error('Request failed:', err);
  }
};

run().catch(console.error);
