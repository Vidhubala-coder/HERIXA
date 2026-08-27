import fs from 'fs';
import path from 'path';

const seedPath = path.join(__dirname, 'seed.ts');
const content = fs.readFileSync(seedPath, 'utf8');

// Parse the monuments array from seed.ts roughly by searching for name and historySections
const monumentMatches = content.matchAll(/name:\s*'([^']+)'/g);
const sectionsMatches = content.matchAll(/historySections:\s*\[/g);

console.log('Seed file analysis:');
// Let's print occurrences of name and historySections
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('name:') || line.includes('historySections:')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
