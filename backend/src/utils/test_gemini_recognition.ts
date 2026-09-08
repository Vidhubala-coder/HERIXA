import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log("Testing Gemini API Key configured:", !!apiKey);

if (!apiKey) {
  console.error("Missing GEMINI_API_KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const imgPath = path.join(__dirname, '../../uploads/monuments/brihadeeswarar.jpeg');
const imgBuffer = fs.readFileSync(imgPath);
const base64Data = imgBuffer.toString('base64');

async function testGeminiRecognition() {
  const prompt = `Analyze this image of a South Indian cultural heritage monument.
Identify which of the following 6 HERIXA monuments it is:
1. brihadeeswarar (Brihadeeswarar Temple, Thanjavur)
2. meenakshi-amman (Meenakshi Amman Temple, Madurai)
3. mahabalipuram (Mahabalipuram Shore Temple)
4. gangaikonda-cholapuram (Gangaikonda Cholapuram)
5. airavatesvara (Airavatesvara Temple, Darasuram)
6. thirumalai-nayakkar (Thirumalai Nayakkar Palace, Madurai)

Respond ONLY in JSON format:
{
  "recognized": true,
  "slug": "brihadeeswarar",
  "confidence": 0.95,
  "monumentName": "Brihadeeswarar Temple"
}
If it is not one of these 6 monuments or is an invalid/unclear image, return {"recognized": false, "slug": null, "confidence": 0.0, "reason": "UNRECOGNIZED"}`;

  console.log("Calling Gemini for monument visual recognition...");

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }
    ]
  });

  console.log("Gemini Response:\n", response.text);
}

testGeminiRecognition().catch(err => {
  console.error("Gemini Recognition Test Error:", err);
});
